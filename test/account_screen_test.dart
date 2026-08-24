import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'support/oceaneyes_fixture.dart';
import 'package:oceaneyes/ui/widgets/glass.dart';
import 'package:oceaneyes/ui/widgets/screen_primitives.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';
import 'package:qr_flutter/qr_flutter.dart';

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
    final controller = FixtureOceanEyesController();
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    expect(find.text('IoT Scanner Console'), findsOneWidget);
    expect(find.text('Scan, pair, or create monitor hardware'), findsOneWidget);
    expect(find.text('Disconnect from Tank'), findsOneWidget);
    expect(find.text('Appearance'), findsOneWidget);
    expect(find.text('Stream Image Adjustments'), findsOneWidget);
    expect(find.text('Background Canvas'), findsOneWidget);
    expect(find.byIcon(LucideIcons.image), findsOneWidget);
    expect(find.text('Signed in with Google'), findsNothing);

    await tester.ensureVisible(find.text('IoT Scanner Console'));
    await tester.tap(find.text('IoT Scanner Console'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.byKey(const ValueKey('tank-pairing-sheet')), findsOneWidget);
    expect(find.text('Connect a tank'), findsOneWidget);
  });

  testWidgets('Account screen subcards use transparent surfaces', (
    tester,
  ) async {
    final controller = FixtureOceanEyesController();
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    final panels = tester.widgetList<GlassPanel>(find.byType(GlassPanel));
    expect(panels, isNotEmpty);
    expect(
      panels.every(
        (panel) =>
            panel.color == Colors.transparent &&
            panel.borderColor == Colors.transparent,
      ),
      isTrue,
    );

    final disclosures = tester.widgetList<DisclosureCard>(
      find.byType(DisclosureCard),
    );
    expect(disclosures, hasLength(4));
    expect(
      disclosures.every(
        (disclosure) =>
            disclosure.panelColor == Colors.transparent &&
            disclosure.panelBorderColor == Colors.transparent,
      ),
      isTrue,
    );
  });

  testWidgets('AI species entries keep their borders', (tester) async {
    final controller = FixtureOceanEyesController()
      ..cameraStage = CameraStage.active
      ..fish = DemoFixtures.populatedFish();
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    final speciesPanel = find.ancestor(
      of: find.text('Species Breakdown'),
      matching: find.byType(GlassPanel),
    );
    expect(speciesPanel, findsOneWidget);
    final panel = tester.widget<GlassPanel>(speciesPanel);
    expect(panel.color, Colors.transparent);
    expect(panel.borderColor, Colors.transparent);

    for (final fish in controller.fish) {
      final speciesEntry = find.byKey(ValueKey('account-species-${fish.id}'));
      expect(speciesEntry, findsOneWidget);
      final decoration = tester.widget<DecoratedBox>(speciesEntry).decoration;
      expect((decoration as BoxDecoration).border, isNotNull);
    }
  });

  testWidgets('fixture pairing entry opens the shared pairing sheet', (
    tester,
  ) async {
    final controller = FixtureOceanEyesController()
      ..tankConnected = false
      ..cameraStage = CameraStage.unavailable;
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    expect(
      find.text('Scan its QR code, enter a tank ID, or create a new tank.'),
      findsOneWidget,
    );
    expect(find.text('Pair'), findsOneWidget);
    expect(find.text('Appearance'), findsOneWidget);
    expect(find.text('Stream Image Adjustments'), findsOneWidget);
    expect(find.text('Background Canvas'), findsOneWidget);

    await tester.tap(find.text('Pair'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.byKey(const ValueKey('tank-pairing-sheet')), findsOneWidget);
    expect(find.text('Connect a tank'), findsOneWidget);
  });

  testWidgets('tank controls expose the active tank pairing QR', (
    tester,
  ) async {
    final controller = FixtureOceanEyesController()..activeTankId = 'tank-test';
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    final qrButton = find.byTooltip('Show tank pairing QR code');
    expect(qrButton, findsOneWidget);

    await tester.ensureVisible(qrButton);
    await tester.tap(qrButton);
    await tester.pumpAndSettle();

    expect(find.text('Tank pairing code'), findsOneWidget);
    expect(find.text('tank-test'), findsOneWidget);
    final qr = find.byType(QrImageView);
    expect(qr, findsOneWidget);
    final qrSemantics = tester
        .widgetList<Semantics>(
          find.ancestor(of: qr, matching: find.byType(Semantics)),
        )
        .map((semantics) => semantics.properties.label);
    expect(qrSemantics, contains('QR code for tank tank-test'));
  });

  testWidgets('disconnect keeps shared settings available in fixture mode', (
    tester,
  ) async {
    final controller = FixtureOceanEyesController();
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
    final controller = OceanEyesController()..tankConnected = true;
    addTearDown(controller.dispose);
    await pumpAccount(tester, controller);

    expect(find.text('Signed in with Google'), findsOneWidget);
    expect(find.text('Sign out'), findsOneWidget);
    expect(find.text('IoT Scanner Console'), findsOneWidget);
    expect(find.text('Stream Image Adjustments'), findsOneWidget);
    expect(find.text('Background Canvas'), findsOneWidget);
    expect(find.byTooltip('Show tank pairing QR code'), findsNothing);
    expect(find.text('Water-line calibration'), findsNothing);
  });
}
