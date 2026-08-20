import '../integrations/power/wake_lock_gateway.dart';

/// Arbitrates wake-lock ownership across independent camera and live features.
class OceanEyesWakeLockCoordinator {
  OceanEyesWakeLockCoordinator({
    required WakeLockGateway? gateway,
    required void Function(Object error, StackTrace stackTrace) onError,
  }) : _gateway = gateway,
       _onError = onError;

  final WakeLockGateway? _gateway;
  final void Function(Object error, StackTrace stackTrace) _onError;

  Future<void> _queue = Future<void>.value();
  bool _inferenceActive = false;
  bool _livePublishing = false;
  bool _requested = false;
  bool _disposed = false;

  void setInferenceActive(bool value) {
    _inferenceActive = value;
    _sync();
  }

  void setLivePublishing(bool value) {
    _livePublishing = value;
    _sync();
  }

  void _sync() {
    final gateway = _gateway;
    if (gateway == null) return;
    final shouldEnable = !_disposed && (_inferenceActive || _livePublishing);
    if (shouldEnable == _requested) return;
    _requested = shouldEnable;
    _queue = _queue.then((_) async {
      try {
        await gateway.setEnabled(shouldEnable);
      } catch (error, stackTrace) {
        _onError(error, stackTrace);
      }
    });
  }

  Future<void> flush() => _queue;

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _inferenceActive = false;
    _livePublishing = false;
    _sync();
    await _queue;
    await _gateway?.dispose();
  }
}
