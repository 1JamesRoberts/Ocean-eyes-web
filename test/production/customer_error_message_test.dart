import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/models/customer_error_message.dart';

void main() {
  test('maps offline provider failures to retryable customer copy', () {
    expect(
      oceanEyesCustomerErrorMessage(
        StateError('FirebaseException: [unavailable] offline'),
      ),
      contains('offline'),
    );
    expect(
      oceanEyesCustomerErrorMessage(
        StateError('https://ocean-eyes-staging.firebaseio.com/readings'),
      ),
      'Something went wrong. Please try again.',
    );
  });

  test('maps permission and camera failures without leaking diagnostics', () {
    expect(
      oceanEyesCustomerErrorMessage(StateError('permission-denied')),
      contains('permission'),
    );
    expect(
      oceanEyesCustomerErrorMessage(StateError('CameraException permission')),
      contains('Camera access'),
    );
  });
}
