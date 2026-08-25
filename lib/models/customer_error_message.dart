/// Converts integration failures into stable, customer-safe copy.
///
/// Provider exception strings can contain project names, URLs, SDK details, or
/// platform diagnostics. Those details belong in local diagnostics, never in a
/// release UI.
String oceanEyesCustomerErrorMessage(Object error) {
  final message = error.toString().toLowerCase();

  if (message.contains('analysis completed') &&
      message.contains('could not be saved')) {
    return 'Analysis completed, but some results could not be saved. Check '
        'your connection and try again.';
  }
  if (message.contains('ai model contract')) {
    return 'The installed AI models are incompatible with this app build. '
        'Camera and live viewing are still available.';
  }
  if (message.contains('ai model initialization') ||
      message.contains('onnx model assets')) {
    return 'The AI models could not load. Camera and live viewing are still '
        'available; retry AI analysis or reinstall the app.';
  }
  if (message.contains('aquarium ai analysis') ||
      message.contains('onnx inference')) {
    return 'AI analysis could not process this frame. Keep the aquarium in '
        'view and try again.';
  }
  if (message.contains('camera') && message.contains('permission')) {
    return 'Camera access is unavailable. Check camera permission in Android '
        'Settings and try again.';
  }
  if (message.contains('camera')) {
    return 'The camera could not start. Close other apps using the camera and '
        'try again.';
  }
  if (message.contains('permission-denied') ||
      message.contains('permission denied')) {
    return 'You do not have permission to change this tank. Check your role '
        'and try again.';
  }
  if (message.contains('unauthenticated') ||
      message.contains('user-token-expired') ||
      message.contains('session expired')) {
    return 'Your session expired. Sign in again to continue.';
  }
  if (message.contains('network-request-failed') ||
      message.contains('unavailable') ||
      message.contains('offline') ||
      message.contains('deadline-exceeded') ||
      message.contains('socketexception') ||
      message.contains('failed host lookup') ||
      message.contains('connection')) {
    return 'You appear to be offline or the service is temporarily '
        'unavailable. Check your connection and retry.';
  }
  if (message.contains('not-found') || message.contains('no tank')) {
    return 'We could not find that tank. Check the ID and try again.';
  }
  if (message.contains('invalid-argument')) {
    return 'That request is not valid. Check the details and try again.';
  }
  if (message.contains('resource-exhausted')) {
    return 'Too many requests were made. Wait a moment and try again.';
  }
  if (message.contains('failed-precondition') || message.contains('aborted')) {
    return 'That action is temporarily unavailable. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
