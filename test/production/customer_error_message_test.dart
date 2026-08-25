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

  test('distinguishes AI load, inference, and persistence failures', () {
    expect(
      oceanEyesCustomerErrorMessage(
        StateError('AI model initialization failed: private/path/model.onnx'),
      ),
      allOf(contains('could not load'), isNot(contains('private/path'))),
    );
    expect(
      oceanEyesCustomerErrorMessage(
        StateError('Aquarium AI analysis failed: tensor details'),
      ),
      allOf(contains('could not process'), isNot(contains('tensor details'))),
    );
    expect(
      oceanEyesCustomerErrorMessage(
        StateError('Analysis completed but some results could not be saved'),
      ),
      contains('could not be saved'),
    );
  });
}
