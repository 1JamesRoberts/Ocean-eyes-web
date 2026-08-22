import 'dart:async';

import '../models/onboarding_models.dart';
import '../models/onboarding_repository.dart';

/// Coordinates account-scoped onboarding state and route presentation.
///
/// It deliberately knows nothing about Firebase, camera permissions, or
/// widgets. Tank operations remain on [OceanEyesController]; this coordinator
/// records only their non-sensitive result and the resumable UI step.
class OceanEyesOnboardingCoordinator {
  OceanEyesOnboardingCoordinator({required OnboardingRepository repository})
    : _repository = repository;

  static const previewAccountNamespace = 'preview';

  final OnboardingRepository _repository;
  Future<void> _writeQueue = Future<void>.value();

  String _accountNamespace = previewAccountNamespace;
  OnboardingState _state = const OnboardingState.initial();
  bool _tankLookupResolved = true;
  bool _hasLinkedTank = true;
  bool _routeOpen = false;
  bool _handoffVisible = false;
  bool _dismissibleAtWelcome = false;

  OnboardingState get state => _state;
  bool get tankLookupResolved => _tankLookupResolved;
  bool get hasLinkedTank => _hasLinkedTank;
  bool get showRoute =>
      _routeOpen && _tankLookupResolved && (!_hasLinkedTank || _handoffVisible);
  bool get showSetupBanner => _tankLookupResolved && !_hasLinkedTank;

  /// Loads the account's saved step. A stable account namespace is used even
  /// for the local preview controller, while no bearer values are included.
  void loadForAccount(String? accountNamespace) {
    final normalized = _normalizeNamespace(accountNamespace);
    _accountNamespace = normalized;
    _state = _repository.load(normalized) ?? const OnboardingState.initial();
    _routeOpen = false;
    _handoffVisible = false;
    _dismissibleAtWelcome = false;
    _tankLookupResolved = false;
    _hasLinkedTank = false;
  }

  /// Handles an auth identity transition. Unfinished state belongs to the
  /// previous identity and must not be carried into the new account.
  void handleAccountIdentityChange(String? accountNamespace) {
    final normalized = _normalizeNamespace(accountNamespace);
    if (normalized == _accountNamespace) return;
    if (_state.isUnfinished) {
      _clearQueued(_accountNamespace);
    }
    loadForAccount(normalized);
  }

  /// Starts the linked-tank gate. The app can remain in its shell while this
  /// is pending, but onboarding cannot present until a first result arrives.
  void beginTankLookup() {
    _tankLookupResolved = false;
    _hasLinkedTank = false;
    _routeOpen = false;
    _handoffVisible = false;
    _dismissibleAtWelcome = false;
  }

  /// Completes the initial linked-tank lookup and decides whether the saved
  /// onboarding step should be resumed.
  void resolveTankLookup(
    Iterable<String> linkedTankIds, {
    bool autoPresent = true,
  }) {
    _tankLookupResolved = true;
    _hasLinkedTank = linkedTankIds.any((tankId) => tankId.trim().isNotEmpty);
    if (_hasLinkedTank) {
      // A successful onboarding handoff can still be visible while the
      // linked-tank stream catches up with the create/join operation.
      if (_state.status != OnboardingStatus.completed) {
        _routeOpen = false;
        _handoffVisible = false;
      }
      return;
    }
    if (!autoPresent || _state.status == OnboardingStatus.postponed) return;
    if (_state.status == OnboardingStatus.completed) return;
    if (_state.status == OnboardingStatus.notStarted) {
      _update(
        const OnboardingState(
          status: OnboardingStatus.inProgress,
          step: OnboardingStep.welcome,
        ),
      );
    }
    _routeOpen = true;
    _dismissibleAtWelcome = false;
  }

  /// Provides the local preview/fixture equivalent of a resolved tank lookup.
  void setLocalTankAvailability(bool connected) {
    _tankLookupResolved = true;
    _hasLinkedTank = connected;
    _routeOpen = false;
    _handoffVisible = false;
    _dismissibleAtWelcome = false;
  }

  void open({bool dismissibleAtWelcome = true}) {
    if (!_tankLookupResolved || _hasLinkedTank) return;
    _dismissibleAtWelcome = dismissibleAtWelcome;
    if (_state.status == OnboardingStatus.postponed) {
      _update(_state.copyWith(status: OnboardingStatus.inProgress));
    } else if (_state.status == OnboardingStatus.notStarted) {
      _update(_state.copyWith(status: OnboardingStatus.inProgress));
    }
    _routeOpen = true;
  }

  void continueFromWelcome() {
    _update(
      _state.copyWith(
        status: OnboardingStatus.inProgress,
        step: OnboardingStep.choosePath,
        completionReadiness: OnboardingCompletionReadiness.pending,
      ),
    );
  }

  void choosePath(OnboardingPath path) {
    _update(
      OnboardingState(
        status: OnboardingStatus.inProgress,
        path: path,
        step: path == OnboardingPath.newTank
            ? OnboardingStep.createTank
            : OnboardingStep.joinTank,
        completionReadiness: OnboardingCompletionReadiness.pending,
      ),
    );
  }

  void markCreated({bool keepRouteOpen = false}) {
    _update(
      OnboardingState(
        status: OnboardingStatus.completed,
        path: OnboardingPath.newTank,
        step: OnboardingStep.ownerPairing,
        completionReadiness: OnboardingCompletionReadiness.ready,
      ),
    );
    if (keepRouteOpen) {
      _routeOpen = true;
      _handoffVisible = true;
    }
  }

  void markJoined({bool keepRouteOpen = false}) {
    _update(
      OnboardingState(
        status: OnboardingStatus.completed,
        path: OnboardingPath.joinExisting,
        step: OnboardingStep.success,
        completionReadiness: OnboardingCompletionReadiness.ready,
      ),
    );
    if (keepRouteOpen) {
      _routeOpen = true;
      _handoffVisible = true;
    }
  }

  void postpone() {
    _update(_state.copyWith(status: OnboardingStatus.postponed));
    _routeOpen = false;
    _handoffVisible = false;
    _dismissibleAtWelcome = false;
  }

  void finishRoute() {
    _routeOpen = false;
    _handoffVisible = false;
    _dismissibleAtWelcome = false;
  }

  /// Returns true when the visible onboarding route changed in response to
  /// back navigation. The controller blocks this call while an operation is
  /// in progress so a request cannot be accidentally dismissed.
  bool back() {
    switch (_state.step) {
      case OnboardingStep.welcome:
        if (!_dismissibleAtWelcome) return false;
        finishRoute();
        return true;
      case OnboardingStep.choosePath:
        _update(
          _state.copyWith(
            status: OnboardingStatus.inProgress,
            step: OnboardingStep.welcome,
            clearPath: true,
          ),
        );
        return true;
      case OnboardingStep.createTank:
      case OnboardingStep.joinTank:
        _update(
          _state.copyWith(
            status: OnboardingStatus.inProgress,
            step: OnboardingStep.choosePath,
          ),
        );
        return true;
      case OnboardingStep.ownerPairing:
      case OnboardingStep.success:
        // The operation is already complete. Returning to the limited shell
        // is safer than presenting a stale form that can create a second tank.
        finishRoute();
        return true;
    }
  }

  void resetForDisconnectedTank() {
    _state = const OnboardingState.initial();
    _routeOpen = false;
    _handoffVisible = false;
    _dismissibleAtWelcome = false;
    _persist();
  }

  Future<void> flush() => _writeQueue;

  String _normalizeNamespace(String? value) {
    final normalized = value?.trim() ?? '';
    return normalized.isEmpty ? previewAccountNamespace : normalized;
  }

  void _update(OnboardingState state) {
    _state = state;
    _persist();
  }

  void _persist() {
    final namespace = _accountNamespace;
    final state = _state;
    final pending = _writeQueue.then((_) => _repository.save(namespace, state));
    _writeQueue = pending.catchError((Object _) {});
  }

  void _clearQueued(String namespace) {
    final pending = _writeQueue.then((_) => _repository.clear(namespace));
    _writeQueue = pending.catchError((Object _) {});
  }
}
