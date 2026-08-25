import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:oceaneyes/app/oceaneyes_bootstrap.dart';
import 'package:oceaneyes/app/production_config.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bootstrap composes the explicitly selected local preview', () async {
    SharedPreferences.setMockInitialValues({});
    final controller = await bootstrapOceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/'),
      config: const OceanEyesProductionConfig(
        googleWebClientId: '',
        iosClientId: '',
        webPushVapidKey: '',
        recaptchaV3SiteKey: '',
        productionEnabled: false,
      ),
    );
    addTearDown(controller.dispose);

    expect(controller.isAuthenticated, isTrue);
    expect(controller.localPreviewEnabled, isTrue);
    expect(controller.productionServicesAvailable, isFalse);
    expect(controller.fish, isEmpty);
  });
}
