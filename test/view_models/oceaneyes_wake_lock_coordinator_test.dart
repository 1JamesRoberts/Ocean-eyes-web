import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/power/wake_lock_gateway.dart';
import 'package:oceaneyes/view_models/oceaneyes_wake_lock_coordinator.dart';

void main() {
  test(
    'keeps the lock while either inference or live publishing owns it',
    () async {
      final gateway = _RecordingWakeLockGateway();
      final coordinator = OceanEyesWakeLockCoordinator(
        gateway: gateway,
        onError: (error, stackTrace) => fail('$error'),
      );

      coordinator.setInferenceActive(true);
      coordinator.setLivePublishing(true);
      coordinator.setInferenceActive(false);
      await coordinator.flush();

      expect(gateway.transitions, [true]);

      coordinator.setLivePublishing(false);
      await coordinator.flush();

      expect(gateway.transitions, [true, false]);
      await coordinator.dispose();
      expect(gateway.disposed, isTrue);
    },
  );
}

final class _RecordingWakeLockGateway implements WakeLockGateway {
  final List<bool> transitions = [];
  bool disposed = false;

  @override
  Future<void> setEnabled(bool enabled) async {
    transitions.add(enabled);
  }

  @override
  Future<void> dispose() async {
    disposed = true;
  }
}
