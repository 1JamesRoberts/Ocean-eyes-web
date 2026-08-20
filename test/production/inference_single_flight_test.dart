import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/ml/inference_single_flight.dart';

void main() {
  test(
    'drops overlapping inference and accepts the next frame when idle',
    () async {
      final guard = InferenceSingleFlight();
      final releaseFirst = Completer<int>();

      final first = guard.run(() => releaseFirst.future);
      expect(guard.isBusy, isTrue);

      final overlapping = await guard.run(() async => 2);
      expect(overlapping, isNull);

      releaseFirst.complete(1);
      expect(await first, 1);
      await guard.waitUntilIdle();
      expect(guard.isBusy, isFalse);
      expect(await guard.run(() async => 3), 3);
    },
  );

  test('releases the guard when inference throws', () async {
    final guard = InferenceSingleFlight();

    await expectLater(
      guard.run<int>(() async => throw StateError('model failed')),
      throwsStateError,
    );

    expect(guard.isBusy, isFalse);
    expect(await guard.run(() async => 4), 4);
  });
}
