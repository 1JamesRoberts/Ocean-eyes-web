import 'dart:ui' show Size;

import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'support/oceaneyes_fixture.dart';

void main() {
  testWidgets('login fixture matches the mock Google transition', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final controller = FixtureOceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/?fixture=login'),
    );
    addTearDown(controller.dispose);

    await tester.pumpWidget(OceanEyesApp(controller: controller));
    await tester.pump(const Duration(milliseconds: 550));

    expect(find.text('OceanEyes'), findsOneWidget);
    expect(find.text('Smart aquarium monitoring'), findsOneWidget);
    expect(find.text('Continue with Google'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Continue with Google'));
    await tester.pump();
    expect(find.text('Connecting…'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 650));
    expect(controller.isAuthenticated, isTrue);
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pump();
    expect(find.text('Continue with Google'), findsNothing);
    expect(find.text('Waiting for monitor data'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('login stays overflow-free on the narrow smoke surface', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final controller = FixtureOceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/?route=login'),
    );
    addTearDown(controller.dispose);
    await tester.pumpWidget(OceanEyesApp(controller: controller));
    await tester.pump(const Duration(milliseconds: 550));

    expect(find.text('Continue with Google'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
