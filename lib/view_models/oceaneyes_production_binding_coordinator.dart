import 'dart:async';

import '../integrations/firebase/firebase_notification_service.dart';
import '../models/aquarium_models.dart';
import '../models/production_auth.dart';
import '../models/production_data.dart';
import '../models/production_repository.dart';

/// Owns authentication, notification setup, and Firestore subscription
/// lifetimes. Presentation mapping stays in the view-model facade callbacks.
class OceanEyesProductionBindingCoordinator {
  OceanEyesProductionBindingCoordinator({
    required ProductionOceanEyesRepository? repository,
    required ProductionAuthGateway? auth,
    required NotificationServiceGateway? notifications,
    required String webPushVapidKey,
    required bool Function() isDisposed,
    required void Function(Object error, [StackTrace? stackTrace]) onError,
  }) : _repository = repository,
       _auth = auth,
       _notifications = notifications,
       _webPushVapidKey = webPushVapidKey,
       _isDisposed = isDisposed,
       _onError = onError;

  final ProductionOceanEyesRepository? _repository;
  final ProductionAuthGateway? _auth;
  final NotificationServiceGateway? _notifications;
  final String _webPushVapidKey;
  final bool Function() _isDisposed;
  final void Function(Object error, [StackTrace? stackTrace]) _onError;

  final List<StreamSubscription<dynamic>> _rootSubscriptions = [];
  final List<StreamSubscription<dynamic>> _tankSubscriptions = [];
  StreamSubscription<List<String>>? _linkedTankIdsSubscription;
  Future<void> _linkedTankRebindQueue = Future<void>.value();
  int _linkedTankSubscriptionGeneration = 0;
  String? _linkedTankTargetUid;
  String? _linkedTankSubscriptionUid;
  bool _initialized = false;

  ProductionAuthUser? get currentUser => _auth?.currentUser;
  bool get isAvailable => _repository != null && _auth != null;
  bool get hasTankSubscriptions => _tankSubscriptions.isNotEmpty;
  bool get hasLinkedAccount => _auth?.hasLinkedAccount ?? false;
  String? get currentNotificationToken => _notifications?.currentToken;

  Future<void> initialize({
    required void Function(ProductionAuthUser? user) onAuthChanged,
    required Future<void> Function() clearTankForAuthChange,
    required void Function(List<String> tankIds) onLinkedTankIds,
    required void Function(NotificationRoute route) onNotificationRoute,
  }) async {
    final repository = _repository;
    final auth = _auth;
    if (_initialized || repository == null || auth == null) return;
    _initialized = true;
    final initialUser = auth.currentUser;
    onAuthChanged(initialUser);
    _rootSubscriptions.add(
      auth.authStateChanges().listen((user) {
        final previousUid = _linkedTankTargetUid;
        onAuthChanged(user);
        if (previousUid != user?.uid) {
          unawaited(
            _rebindLinkedTankIds(
              user?.uid,
              clearTankForAuthChange: clearTankForAuthChange,
              onLinkedTankIds: onLinkedTankIds,
            ),
          );
        }
      }, onError: _onError),
    );
    await _rebindLinkedTankIds(
      initialUser?.uid,
      clearTankForAuthChange: clearTankForAuthChange,
      onLinkedTankIds: onLinkedTankIds,
    );
    if (_isDisposed()) return;

    final notifications = _notifications;
    if (notifications != null) {
      _rootSubscriptions.add(
        notifications.openedRoutes.listen(
          onNotificationRoute,
          onError: _onError,
        ),
      );
      try {
        await notifications.initialize(
          saveToken: repository.saveFcmToken,
          webVapidKey: _webPushVapidKey,
        );
      } catch (error, stackTrace) {
        _onError(error, stackTrace);
      }
    }
  }

  Future<GoogleAccountLinkResult> linkGoogleAccount({String? fcmToken}) {
    final auth = _auth;
    if (auth == null) {
      throw StateError('Authentication is not available.');
    }
    return auth.linkGoogleAccount(fcmToken: fcmToken);
  }

  Future<bool> requestNotificationPermission() {
    final notifications = _notifications;
    final repository = _repository;
    if (notifications == null || repository == null) {
      return Future<bool>.value(false);
    }
    return notifications.requestPermission(
      saveToken: repository.saveFcmToken,
      webVapidKey: _webPushVapidKey,
    );
  }

  Future<void> bindTank({
    required String tankId,
    required void Function(ProductionTank?) onTank,
    required void Function(ProductionReadingBundle) onReadingBundle,
    required void Function(Object error, StackTrace stackTrace) onReadingError,
    required void Function(List<FishEntry>) onFishInventory,
    required void Function(List<ProductionAlert>) onAlerts,
    required void Function(ProductionLiveState?) onLiveState,
    required void Function(List<ProductionLiveRequest>) onLiveRequests,
  }) async {
    final repository = _repository;
    if (repository == null || _isDisposed()) return;
    await unbindTank();
    if (_isDisposed()) return;
    _tankSubscriptions.addAll([
      repository.watchTank(tankId).listen(onTank, onError: _onError),
      repository
          .watchReadingBundle(tankId)
          .listen(onReadingBundle, onError: onReadingError),
      repository
          .watchFishInventory(tankId)
          .listen(onFishInventory, onError: _onError),
      repository.watchAlerts(tankId).listen(onAlerts, onError: _onError),
      repository.watchLiveState(tankId).listen(onLiveState, onError: _onError),
      repository
          .watchLiveRequests(tankId)
          .listen(onLiveRequests, onError: _onError),
    ]);
  }

  Future<void> unbindTank() async {
    for (final subscription in _tankSubscriptions) {
      await subscription.cancel();
    }
    _tankSubscriptions.clear();
  }

  Future<void> _rebindLinkedTankIds(
    String? uid, {
    required Future<void> Function() clearTankForAuthChange,
    required void Function(List<String> tankIds) onLinkedTankIds,
  }) {
    final generation = ++_linkedTankSubscriptionGeneration;
    _linkedTankTargetUid = uid;
    _linkedTankRebindQueue = _linkedTankRebindQueue.then((_) async {
      try {
        if (_isDisposed() || generation != _linkedTankSubscriptionGeneration) {
          return;
        }
        final previous = _linkedTankIdsSubscription;
        final previousUid = _linkedTankSubscriptionUid;
        _linkedTankIdsSubscription = null;
        if (previous != null) await previous.cancel();
        if (_isDisposed() ||
            generation != _linkedTankSubscriptionGeneration ||
            uid != _linkedTankTargetUid) {
          return;
        }
        if (previousUid != null && previousUid != uid) {
          await clearTankForAuthChange();
          if (_isDisposed() ||
              generation != _linkedTankSubscriptionGeneration ||
              uid != _linkedTankTargetUid) {
            return;
          }
        }
        _linkedTankSubscriptionUid = null;
        if (uid == null || uid.isEmpty) return;

        _linkedTankSubscriptionUid = uid;
        final subscription = _repository!.watchLinkedTankIds().listen(
          (tankIds) {
            if (!_isDisposed() &&
                generation == _linkedTankSubscriptionGeneration &&
                uid == _linkedTankSubscriptionUid) {
              onLinkedTankIds(tankIds);
            }
          },
          onError: (Object error, StackTrace stackTrace) {
            if (!_isDisposed() &&
                generation == _linkedTankSubscriptionGeneration &&
                uid == _linkedTankSubscriptionUid) {
              _onError(error, stackTrace);
            }
          },
        );
        if (_isDisposed() || generation != _linkedTankSubscriptionGeneration) {
          await subscription.cancel();
          return;
        }
        _linkedTankIdsSubscription = subscription;
      } catch (error, stackTrace) {
        if (!_isDisposed() && generation == _linkedTankSubscriptionGeneration) {
          _linkedTankSubscriptionUid = null;
          _linkedTankIdsSubscription = null;
          _onError(error, stackTrace);
        }
      }
    });
    return _linkedTankRebindQueue;
  }

  Future<void> dispose() async {
    _linkedTankSubscriptionGeneration += 1;
    _linkedTankTargetUid = null;
    _linkedTankSubscriptionUid = null;
    await _linkedTankIdsSubscription?.cancel();
    _linkedTankIdsSubscription = null;
    await unbindTank();
    for (final subscription in _rootSubscriptions) {
      await subscription.cancel();
    }
    _rootSubscriptions.clear();
    await _notifications?.dispose();
  }
}
