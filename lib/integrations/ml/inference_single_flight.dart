import 'dart:async';

/// Small reusable guard that makes expensive inference calls single-flight.
///
/// A caller arriving while [run] is active receives null without queueing stale
/// camera frames. The guard is released even when the operation throws.
final class InferenceSingleFlight {
  bool _busy = false;
  Future<void>? _idle;

  bool get isBusy => _busy;

  Future<T?> run<T>(Future<T> Function() operation) async {
    if (_busy) return null;
    _busy = true;
    final completer = Completer<void>();
    _idle = completer.future;
    try {
      return await operation();
    } finally {
      _busy = false;
      completer.complete();
      _idle = null;
    }
  }

  Future<void> waitUntilIdle() => _idle ?? Future.value();
}
