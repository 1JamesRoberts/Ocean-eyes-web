import 'dart:async';

/// Serializes camera ownership and lifecycle operations in invocation order.
///
/// Enqueuing increments [isBusy] synchronously, which prevents two callers in
/// the same event-loop turn from both observing an idle camera and starting a
/// transition. An operation failure is returned to its caller but does not
/// poison later operations.
final class CameraOperationQueue {
  Future<void> _tail = Future<void>.value();
  int _pendingOperations = 0;

  bool get isBusy => _pendingOperations > 0;

  Future<T> run<T>(FutureOr<T> Function() operation) {
    _pendingOperations += 1;
    final operationResult = _tail.then<T>((_) => operation());
    final result = operationResult.whenComplete(() {
      _pendingOperations -= 1;
    });
    _tail = result.then<void>(
      (_) {},
      onError: (Object error, StackTrace stackTrace) {},
    );
    return result;
  }

  Future<void> waitUntilIdle() => _tail;
}
