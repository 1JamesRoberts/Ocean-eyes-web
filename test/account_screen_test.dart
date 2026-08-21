import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpAccount(
    WidgetTester tester,
    OceanEyesController controller,
  ) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    controller
      ..isAuthenticated = true
      ..activeTab = PrimaryTab.account;
    await tester.pumpWidget(OceanEyesApp(controller: controller));
    await tester.pumpAndSettle();
  }

  testWidgets('fixture Account screen uses the release tank controls', (
    tester,
  ) async {
    final controller = OceanEyesController();
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    expect(find.text('IoT Scanner Console'), findsOneWidget);
    expect(find.text('Scan, pair, or create monitor hardware'), findsOneWidget);
    expect(find.text('Disconnect from Tank'), findsOneWidget);
    expect(find.text('Stream Image Adjustments'), findsOneWidget);
    expect(find.text('Background Canvas'), findsOneWidget);
    expect(find.text('Protect this account'), findsNothing);

    await tester.ensureVisible(find.text('IoT Scanner Console'));
    await tester.tap(find.text('IoT Scanner Console'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.byKey(const ValueKey('tank-pairing-sheet')), findsOneWidget);
    expect(find.text('Connect a tank'), findsOneWidget);
  });

  testWidgets('fixture pairing entry opens the shared pairing sheet', (
    tester,
  ) async {
    final controller = OceanEyesController()
      ..tankConnected = false
      ..cameraStage = CameraStage.unavailable;
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    expect(
      find.text('Scan its QR code, enter a tank ID, or create a new tank.'),
      findsOneWidget,
    );
    expect(find.text('Pair'), findsOneWidget);
    expect(find.text('Stream Image Adjustments'), findsOneWidget);
    expect(find.text('Background Canvas'), findsOneWidget);

    await tester.tap(find.text('Pair'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.byKey(const ValueKey('tank-pairing-sheet')), findsOneWidget);
    expect(find.text('Connect a tank'), findsOneWidget);
  });

  testWidgets('disconnect keeps shared settings available in fixture mode', (
    tester,
  ) async {
    final controller = OceanEyesController();
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    await tester.ensureVisible(find.text('Disconnect from Tank'));
    await tester.tap(find.text('Disconnect from Tank'));
    await tester.pump();
    expect(find.text('Yes, Disconnect'), findsOneWidget);

    await tester.tap(find.text('Yes, Disconnect'));
    await tester.pump();
    expect(controller.tankConnected, isFalse);
    expect(find.text('Pair'), findsOneWidget);
    expect(find.text('Stream Image Adjustments'), findsOneWidget);
    expect(find.text('Background Canvas'), findsOneWidget);
    expect(find.text('Disconnect from Tank'), findsNothing);
  });

  testWidgets('production retains gated account controls and shared settings', (
    tester,
  ) async {
    final controller = OceanEyesController(productionEnabled: true);
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    expect(find.text('Protect this account'), findsOneWidget);
    expect(find.text('IoT Scanner Console'), findsOneWidget);
    expect(find.text('Stream Image Adjustments'), findsOneWidget);
    expect(find.text('Background Canvas'), findsOneWidget);
    expect(find.byTooltip('Show tank pairing QR code'), findsNothing);
    expect(find.text('Water-line calibration'), findsNothing);
  });
}
