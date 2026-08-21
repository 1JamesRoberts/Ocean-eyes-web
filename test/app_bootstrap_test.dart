import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:oceaneyes/app/oceaneyes_bootstrap.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('default bootstrap uses the local preview runtime', () async {
    SharedPreferences.setMockInitialValues({});
    final controller = await bootstrapOceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/'),
    );

    expect(controller.productionEnabled, isFalse);
    expect(controller.isAuthenticated, isTrue);

    controller.dispose();
  });
}
