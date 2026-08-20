import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../../app/production_config.dart';

class NotificationRoute {
  const NotificationRoute({
    required this.tankId,
    required this.alertId,
    required this.type,
  });

  final String tankId;
  final String alertId;
  final String type;

  static NotificationRoute? fromMessage(RemoteMessage message) {
    final tankId = message.data['tank_id'];
    final alertId = message.data['alert_id'];
    if (tankId == null ||
        tankId.isEmpty ||
        alertId == null ||
        alertId.isEmpty) {
      return null;
    }
    return NotificationRoute(
      tankId: tankId,
      alertId: alertId,
      type: message.data['type'] ?? '',
    );
  }
}

abstract interface class NotificationServiceGateway {
  Stream<NotificationRoute> get openedRoutes;

  String? get currentToken;

  Future<void> initialize({
    required Future<void> Function(String token) saveToken,
    String? webVapidKey,
  });

  Future<void> dispose();
}

/// Persists an FCM token with bounded exponential retry.
///
/// Token refreshes can arrive while Firestore is briefly offline. Treating the
/// first write as fire-and-forget can leave the user document pointing at an
/// obsolete token until the next refresh, which may be days later.
Future<void> persistFcmTokenWithRetry(
  String token,
  Future<void> Function(String token) saveToken, {
  int maxAttempts = 5,
  Duration initialDelay = const Duration(milliseconds: 250),
  Future<void> Function(Duration delay) delay = Future<void>.delayed,
}) async {
  if (maxAttempts < 1) {
    throw ArgumentError.value(maxAttempts, 'maxAttempts', 'must be positive');
  }
  Object? lastError;
  StackTrace? lastStackTrace;
  for (var attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await saveToken(token);
      return;
    } catch (error, stackTrace) {
      lastError = error;
      lastStackTrace = stackTrace;
      if (attempt + 1 < maxAttempts) {
        await delay(initialDelay * (1 << attempt));
      }
    }
  }
  Error.throwWithStackTrace(lastError!, lastStackTrace!);
}

@pragma('vm:entry-point')
Future<void> oceanEyesFirebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  if (Firebase.apps.isEmpty) {
    final config = OceanEyesProductionConfig.fromEnvironment();
    await Firebase.initializeApp(
      options: config.firebaseOptionsForCurrentPlatform(),
    );
  }
  debugPrint('[fcm] background message ${message.messageId ?? '(no id)'}');
}

/// Owns FCM permission, token refresh, and notification-open routing.
///
/// Token persistence stays in the user repository and is injected as
/// callbacks, which keeps this service independent of the Firestore schema.
class FirebaseNotificationService implements NotificationServiceGateway {
  FirebaseNotificationService({FirebaseMessaging? messaging})
    : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;
  final StreamController<NotificationRoute> _routes =
      StreamController<NotificationRoute>.broadcast();
  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  Future<void> _tokenSaveQueue = Future<void>.value();
  bool _initialized = false;
  bool _disposed = false;
  String? _token;

  @override
  Stream<NotificationRoute> get openedRoutes => _routes.stream;

  @override
  String? get currentToken => _token;

  @override
  Future<void> initialize({
    required Future<void> Function(String token) saveToken,
    String? webVapidKey,
  }) async {
    if (_initialized) return;
    _initialized = true;
    FirebaseMessaging.onBackgroundMessage(
      oceanEyesFirebaseMessagingBackgroundHandler,
    );

    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    _tokenRefreshSubscription = _messaging.onTokenRefresh.listen((token) {
      _token = token;
      _scheduleTokenSave(token, saveToken);
    });
    _foregroundSubscription = FirebaseMessaging.onMessage.listen((message) {
      debugPrint('[fcm] foreground message ${message.messageId ?? '(no id)'}');
    });
    _openedSubscription = FirebaseMessaging.onMessageOpenedApp.listen(
      _emitRoute,
    );

    try {
      _token = await _messaging.getToken(
        vapidKey: kIsWeb && (webVapidKey?.isNotEmpty ?? false)
            ? webVapidKey
            : null,
      );
      final token = _token;
      if (token != null && token.isNotEmpty) {
        _scheduleTokenSave(token, saveToken);
      }
    } on FirebaseException catch (error) {
      // Apple devices can reach this before APNs has supplied its token. The
      // token-refresh stream will retry once native registration completes.
      debugPrint('[fcm] initial token unavailable: ${error.code}');
    }
    final initial = await _messaging.getInitialMessage();
    if (initial != null) _emitRoute(initial);
  }

  void _scheduleTokenSave(
    String token,
    Future<void> Function(String token) saveToken,
  ) {
    final operation = _tokenSaveQueue.then((_) async {
      if (_disposed) return;
      await persistFcmTokenWithRetry(token, saveToken);
    });
    _tokenSaveQueue = operation.catchError((Object error, StackTrace stack) {
      debugPrint('[fcm] token persistence failed after retries: $error');
    });
  }

  void _emitRoute(RemoteMessage message) {
    final route = NotificationRoute.fromMessage(message);
    if (route != null && !_routes.isClosed) _routes.add(route);
  }

  @override
  Future<void> dispose() async {
    _disposed = true;
    await _tokenRefreshSubscription?.cancel();
    await _foregroundSubscription?.cancel();
    await _openedSubscription?.cancel();
    await _tokenSaveQueue;
    await _routes.close();
  }
}
