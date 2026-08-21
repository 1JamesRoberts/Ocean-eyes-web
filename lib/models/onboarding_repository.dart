import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'onboarding_models.dart';

/// Persistence boundary for account-scoped, non-sensitive onboarding state.
abstract interface class OnboardingRepository {
  OnboardingState? load(String accountNamespace);

  Future<void> save(String accountNamespace, OnboardingState state);

  Future<void> clear(String accountNamespace);
}

/// In-memory implementation used by controllers that are deliberately
/// composed without persistence, such as isolated widget and unit tests.
class InMemoryOnboardingRepository implements OnboardingRepository {
  final Map<String, OnboardingState> _states = {};

  @override
  OnboardingState? load(String accountNamespace) => _states[accountNamespace];

  @override
  Future<void> save(String accountNamespace, OnboardingState state) async {
    _states[accountNamespace] = state;
  }

  @override
  Future<void> clear(String accountNamespace) async {
    _states.remove(accountNamespace);
  }
}

/// SharedPreferences adapter with a stable namespace per authenticated user.
///
/// Only status, path, step, and completion readiness are stored. The encoded
/// namespace is the account key; raw pairing values never enter this store.
class SharedPreferencesOnboardingRepository implements OnboardingRepository {
  SharedPreferencesOnboardingRepository(this._preferences);

  static const _prefix = 'oceaneyes.onboarding.v1';

  final SharedPreferences _preferences;

  @override
  OnboardingState? load(String accountNamespace) {
    final base = _baseKey(accountNamespace);
    final status = _readStatus(_preferences.getString('$base.status'));
    if (status == null) return null;
    return OnboardingState(
      status: status,
      path: _readPath(_preferences.getString('$base.path')),
      step:
          _readStep(_preferences.getString('$base.step')) ??
          OnboardingStep.welcome,
      completionReadiness:
          _readReadiness(_preferences.getString('$base.readiness')) ??
          (status == OnboardingStatus.completed
              ? OnboardingCompletionReadiness.ready
              : OnboardingCompletionReadiness.pending),
    );
  }

  @override
  Future<void> save(String accountNamespace, OnboardingState state) async {
    final base = _baseKey(accountNamespace);
    await Future.wait<void>([
      _preferences.setString('$base.status', state.status.name),
      _preferences.setString('$base.path', state.path?.name ?? ''),
      _preferences.setString('$base.step', state.step.name),
      _preferences.setString('$base.readiness', state.completionReadiness.name),
    ]);
  }

  @override
  Future<void> clear(String accountNamespace) async {
    final base = _baseKey(accountNamespace);
    await Future.wait<void>([
      _preferences.remove('$base.status'),
      _preferences.remove('$base.path'),
      _preferences.remove('$base.step'),
      _preferences.remove('$base.readiness'),
    ]);
  }

  String _baseKey(String accountNamespace) {
    final namespace = accountNamespace.trim().isEmpty
        ? 'preview'
        : accountNamespace.trim();
    final encoded = base64UrlEncode(utf8.encode(namespace));
    return '$_prefix.$encoded';
  }

  OnboardingStatus? _readStatus(String? value) {
    for (final item in OnboardingStatus.values) {
      if (item.name == value) return item;
    }
    return null;
  }

  OnboardingPath? _readPath(String? value) {
    for (final item in OnboardingPath.values) {
      if (item.name == value) return item;
    }
    return null;
  }

  OnboardingStep? _readStep(String? value) {
    for (final item in OnboardingStep.values) {
      if (item.name == value) return item;
    }
    return null;
  }

  OnboardingCompletionReadiness? _readReadiness(String? value) {
    for (final item in OnboardingCompletionReadiness.values) {
      if (item.name == value) return item;
    }
    return null;
  }
}
