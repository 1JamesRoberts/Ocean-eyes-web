import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<OceanEyesController> pumpReferenceApp(WidgetTester tester) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final controller = OceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/?fixture=populated'),
    );
    addTearDown(controller.dispose);
    await tester.pumpWidget(OceanEyesApp(controller: controller));
    await tester.pumpAndSettle();
    return controller;
  }

  testWidgets('renders the populated 393 by 852 dashboard', (tester) async {
    final controller = await pumpReferenceApp(tester);

    expect(find.text('AQUARIUM OVERVIEW'), findsOneWidget);
    expect(find.text('Aquarium Health'), findsOneWidget);
    expect(find.text('92'), findsOneWidget);
    expect(find.text('Dashboard'), findsOneWidget);
    expect(controller.totalFish, 20);
    expect(tester.takeException(), isNull);
  });

  testWidgets('switches primary tabs and opens origin-aware history', (
    tester,
  ) async {
    final controller = await pumpReferenceApp(tester);

    await tester.tap(find.text('Analytics'));
    await tester.pumpAndSettle();
    expect(controller.activeTab, PrimaryTab.analytics);
    expect(find.text('AQUARIUM INTELLIGENCE'), findsOneWidget);

    controller.openHistory();
    await tester.pumpAndSettle();
    expect(find.text('CLARITY ANALYTICS'), findsOneWidget);

    controller.closeSecondaryRoute();
    await tester.pumpAndSettle();
    expect(controller.activeTab, PrimaryTab.analytics);
    expect(find.text('AQUARIUM INTELLIGENCE'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('covers waiting, empty, and error fixtures without overflow', (
    tester,
  ) async {
    final controller = await pumpReferenceApp(tester);

    controller.applyFixture(FixtureScenario.dashboardWaiting);
    await tester.pumpAndSettle();
    expect(find.text('Waiting for monitor data'), findsOneWidget);

    controller.applyFixture(FixtureScenario.fishEmpty);
    controller.selectTab(PrimaryTab.myFish);
    await tester.pumpAndSettle();
    expect(find.text('No fish in your inventory'), findsOneWidget);

    controller.applyFixture(FixtureScenario.analyticsError);
    controller.selectTab(PrimaryTab.analytics);
    await tester.pumpAndSettle();
    expect(find.text('Analytics could not be loaded'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('smoke-tests every tab on compact and large phones', (
    tester,
  ) async {
    for (final size in const [Size(360, 640), Size(430, 932)]) {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      final controller = OceanEyesController();
      await tester.pumpWidget(OceanEyesApp(controller: controller));
      await tester.pumpAndSettle();

      for (final tab in PrimaryTab.values) {
        controller.selectTab(tab);
        // The live aquarium hero intentionally keeps its fish-motion ticker
        // running, so use a bounded pump instead of waiting for all frames to
        // settle forever.
        await tester.pump(const Duration(milliseconds: 600));
        expect(
          tester.takeException(),
          isNull,
          reason: '${tab.name} overflowed at ${size.width}×${size.height}',
        );
      }
      controller.dispose();
      await tester.pumpWidget(const SizedBox.shrink());
    }
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });

  testWidgets('permission and alert resolution transitions are functional', (
    tester,
  ) async {
    final controller = await pumpReferenceApp(tester);
    controller.applyFixture(FixtureScenario.cameraPermission);
    controller.selectTab(PrimaryTab.account);
    await tester.pumpAndSettle();
    expect(find.text('Allow Camera Access'), findsOneWidget);

    await tester.tap(find.text('Allow Camera Access'));
    await tester.pump(const Duration(milliseconds: 550));
    expect(controller.cameraStage, CameraStage.active);

    controller.openAlerts();
    controller.openAlertDetail('alert-turbidity');
    await tester.pumpAndSettle();
    final resolveButton = find.text('Mark Alert as Resolved');
    expect(resolveButton, findsOneWidget);
    await tester.ensureVisible(resolveButton);
    await tester.tap(resolveButton);
    await tester.pumpAndSettle();
    expect(
      controller.alerts
          .singleWhere((alert) => alert.id == 'alert-turbidity')
          .resolved,
      isTrue,
    );
    expect(controller.selectedAlertId, isNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('analytics hero controls open their selectors in place', (
    tester,
  ) async {
    final controller = await pumpReferenceApp(tester);
    controller.selectTab(PrimaryTab.analytics);
    await tester.pump(const Duration(milliseconds: 600));

    await tester.tap(find.byKey(const ValueKey('analytics-species-filter')));
    await tester.pumpAndSettle();
    expect(find.text('Filter by species'), findsOneWidget);
    expect(controller.activeTab, PrimaryTab.analytics);

    await tester.tap(find.byTooltip('Close species selector'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('analytics-date-filter')));
    await tester.pumpAndSettle();
    expect(find.text('Date & time range'), findsOneWidget);
    expect(controller.activeTab, PrimaryTab.analytics);
    expect(tester.takeException(), isNull);
  });

  testWidgets('fullscreen back closes drawer before the camera overlay', (
    tester,
  ) async {
    final controller = await pumpReferenceApp(tester);
    controller.selectTab(PrimaryTab.account);
    controller.setFullscreenCamera(true);
    controller.toggleInventoryDrawer();
    await tester.pumpAndSettle();
    expect(find.text('Dashboard'), findsNothing);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(controller.inventoryDrawerOpen, isFalse);
    expect(controller.fullscreenCamera, isTrue);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(controller.fullscreenCamera, isFalse);
    expect(find.text('Dashboard'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('expanded inventory and large text stay overflow-free', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.6;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

    final controller = OceanEyesController(
      launchUri: Uri.parse(
        'https://oceaneyes.test/?fixture=populated&tab=my_fish',
      ),
    )..expandedFishId = 'fish-cardinal';
    addTearDown(controller.dispose);
    await tester.pumpWidget(OceanEyesApp(controller: controller));
    await tester.pump(const Duration(milliseconds: 700));
    expect(tester.takeException(), isNull);

    for (final tab in PrimaryTab.values) {
      controller.selectTab(tab);
      await tester.pump(const Duration(milliseconds: 600));
      final exception = tester.takeException();
      expect(
        exception,
        isNull,
        reason: '${tab.name} overflowed with 1.6× text',
      );
    }
  });
}
