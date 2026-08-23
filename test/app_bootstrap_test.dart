import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:oceaneyes/app/oceaneyes_bootstrap.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bootstrap rejects an unconfigured production runtime', () async {
    SharedPreferences.setMockInitialValues({});
    await expectLater(
      bootstrapOceanEyesController(
        launchUri: Uri.parse('https://oceaneyes.test/'),
      ),
      throwsA(isA<OceanEyesBootstrapException>()),
    );
  });
}
