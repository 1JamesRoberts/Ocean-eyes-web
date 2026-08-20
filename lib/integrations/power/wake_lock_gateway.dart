import 'package:wakelock_plus/wakelock_plus.dart';

/// Injectable screen-awake boundary for unattended production monitoring.
///
/// The fixture composition root never constructs this gateway, so importing
/// production code cannot itself invoke the platform plugin.
abstract interface class WakeLockGateway {
  Future<void> setEnabled(bool enabled);

  Future<void> dispose();
}

final class ProductionWakeLockGateway implements WakeLockGateway {
  bool _enabled = false;
  bool _disposed = false;

  @override
  Future<void> setEnabled(bool enabled) async {
    if (_disposed || enabled == _enabled) return;
    if (enabled) {
      await WakelockPlus.enable();
    } else {
      await WakelockPlus.disable();
    }
    _enabled = enabled;
  }

  @override
  Future<void> dispose() async {
    if (_disposed) return;
    if (_enabled) await WakelockPlus.disable();
    _enabled = false;
    _disposed = true;
  }
}
