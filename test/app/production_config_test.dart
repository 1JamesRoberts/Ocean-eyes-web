import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/production_config.dart';

void main() {
  test('local preview skips production validation', () {
    const config = OceanEyesProductionConfig(
      googleWebClientId: '',
      iosClientId: '',
      webPushVapidKey: '',
      recaptchaV3SiteKey: '',
      privacyPolicyUrl: '',
      termsOfServiceUrl: '',
      productionEnabled: false,
    );

    expect(config.validate(), isNull);
  });

  test('production mode still rejects missing values', () {
    const config = OceanEyesProductionConfig(
      googleWebClientId: '',
      iosClientId: '',
      webPushVapidKey: '',
      recaptchaV3SiteKey: '',
      privacyPolicyUrl: '',
      termsOfServiceUrl: '',
      productionEnabled: true,
    );

    final error = config.validate();
    expect(error, isNotNull);
    expect(error, contains('OCEANEYES_PRIVACY_POLICY_URL'));
    expect(error, contains('OCEANEYES_TERMS_OF_SERVICE_URL'));
  });
}
