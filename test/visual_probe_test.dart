import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'support/oceaneyes_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('captures the reference dashboard', (tester) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final controller = FixtureOceanEyesController(
      launchUri: Uri.parse(
        'https://oceaneyes.test/?fixture=populated&tab=dashboard',
      ),
    );
    addTearDown(controller.dispose);
    await tester.pumpWidget(OceanEyesApp(controller: controller));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(OceanEyesApp),
      matchesGoldenFile('goldens/visual_probe.png'),
    );
  });
}
