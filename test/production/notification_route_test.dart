import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/firebase/firebase_notification_service.dart';

void main() {
  test('maps an alert notification data payload to a route', () {
    const message = RemoteMessage(
      data: {
        'tank_id': 'tank-123',
        'alert_id': 'alert-456',
        'type': 'fish_drop',
      },
    );

    final route = NotificationRoute.fromMessage(message);

    expect(route, isNotNull);
    expect(route!.tankId, 'tank-123');
    expect(route.alertId, 'alert-456');
    expect(route.type, 'fish_drop');
  });

  test('ignores notification payloads without both route identifiers', () {
    expect(
      NotificationRoute.fromMessage(
        const RemoteMessage(data: {'tank_id': 'tank-123'}),
      ),
      isNull,
    );
  });

  test('retries a transient FCM token persistence failure', () async {
    var attempts = 0;
    final delays = <Duration>[];

    await persistFcmTokenWithRetry('new-token', (token) async {
      expect(token, 'new-token');
      attempts += 1;
      if (attempts < 3) throw StateError('temporarily offline');
    }, delay: (duration) async => delays.add(duration));

    expect(attempts, 3);
    expect(delays, const [
      Duration(milliseconds: 250),
      Duration(milliseconds: 500),
    ]);
  });

  test(
    'surfaces an FCM token persistence failure after its retry budget',
    () async {
      var attempts = 0;

      await expectLater(
        persistFcmTokenWithRetry(
          'bad-token',
          (_) async {
            attempts += 1;
            throw StateError('permission denied');
          },
          maxAttempts: 2,
          delay: (_) async {},
        ),
        throwsStateError,
      );
      expect(attempts, 2);
    },
  );
}
