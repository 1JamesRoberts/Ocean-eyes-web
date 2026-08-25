import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/production_config.dart';

void main() {
  test('debug builds use real integrations by default', () {
    final config = OceanEyesProductionConfig.fromEnvironment();

    expect(config.productionEnabled, isTrue);
    expect(config.googleWebClientId, isNotEmpty);
    expect(config.iosClientId, isNotEmpty);
  });

  test('local preview skips production validation', () {
    const config = OceanEyesProductionConfig(
      googleWebClientId: '',
      iosClientId: '',
      webPushVapidKey: '',
      recaptchaV3SiteKey: '',
      productionEnabled: false,
    );

    expect(config.validate(), isNull);
  });

  test('production mode validates only platform service values', () {
    const config = OceanEyesProductionConfig(
      googleWebClientId: '',
      iosClientId: '',
      webPushVapidKey: '',
      recaptchaV3SiteKey: '',
      productionEnabled: true,
    );

    final error = config.validate();
    expect(error, isNotNull);
    expect(error, contains('OCEANEYES_GOOGLE_WEB_CLIENT_ID'));
  });

  test('web production does not require optional messaging features', () {
    if (!kIsWeb) return;

    const config = OceanEyesProductionConfig(
      googleWebClientId: 'configured-web-client-id',
      iosClientId: '',
      webPushVapidKey: '',
      recaptchaV3SiteKey: '',
      productionEnabled: true,
    );

    expect(config.validate(), isNull);
  });
}
