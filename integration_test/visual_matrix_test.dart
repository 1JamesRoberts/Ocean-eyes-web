import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  var androidSurfaceConverted = false;

  Future<void> pumpBounded(
    WidgetTester tester, {
    Duration duration = const Duration(milliseconds: 600),
  }) async {
    // Some visual fixtures intentionally contain an endlessly repeating fish
    // animation. A bounded sequence advances asset loading, post-frame work,
    // and finite transitions without waiting for the app to become idle.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 32));
    await tester.pump(duration);
  }

  Future<void> capture(
    WidgetTester tester,
    OceanEyesController controller,
    String name, {
    Future<void> Function(WidgetTester tester, OceanEyesController controller)?
    prepare,
  }) async {
    try {
      await tester.pumpWidget(OceanEyesApp(controller: controller));
      await pumpBounded(tester);
      if (!androidSurfaceConverted &&
          !kIsWeb &&
          defaultTargetPlatform == TargetPlatform.android) {
        await binding.convertFlutterSurfaceToImage();
        androidSurfaceConverted = true;
        await tester.pump(const Duration(milliseconds: 32));
      }
      if (prepare != null) {
        await prepare(tester, controller);
        await tester.pump(const Duration(milliseconds: 32));
      }

      expect(
        tester.takeException(),
        isNull,
        reason: '$name produced a framework exception before capture',
      );
      await binding.takeScreenshot('393x852__$name');
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      controller.dispose();
    }
  }

  void useReferenceEnvironment(WidgetTester tester) {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    tester.view.padding = FakeViewPadding.zero;
    tester.view.viewPadding = FakeViewPadding.zero;
    tester.view.viewInsets = FakeViewPadding.zero;
    tester.platformDispatcher.clearTextScaleFactorTestValue();
    tester.platformDispatcher.clearAccessibilityFeaturesTestValue();
  }

  testWidgets('captures the deterministic visual state matrix', (tester) async {
    useReferenceEnvironment(tester);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
      tester.view.resetPadding();
      tester.view.resetViewPadding();
      tester.view.resetViewInsets();
      tester.platformDispatcher.clearTextScaleFactorTestValue();
      tester.platformDispatcher.clearAccessibilityFeaturesTestValue();
    });

    await capture(
      tester,
      OceanEyesController(
        launchUri: Uri.parse('https://oceaneyes.test/?fixture=login'),
      ),
      'login__idle',
    );

    for (final entry in <(FixtureScenario, String)>[
      (FixtureScenario.dashboardWaiting, 'dashboard__waiting'),
      (FixtureScenario.populated, 'dashboard__healthy'),
      (FixtureScenario.dashboardWarning, 'dashboard__warning'),
    ]) {
      final controller = OceanEyesController()
        ..applyFixture(entry.$1, notify: false);
      await capture(tester, controller, entry.$2);
    }
    final dashboardNoAlerts = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..alerts = const [];
    await capture(tester, dashboardNoAlerts, 'dashboard__no-alerts');

    for (final entry in <(FixtureScenario, String)>[
      (FixtureScenario.fishEmpty, 'my-fish__empty'),
      (FixtureScenario.populated, 'my-fish__populated'),
    ]) {
      final controller = OceanEyesController()
        ..applyFixture(entry.$1, notify: false)
        ..activeTab = PrimaryTab.myFish;
      await capture(tester, controller, entry.$2);
    }
    final expandedFish = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..activeTab = PrimaryTab.myFish
      ..expandedFishId = 'fish-cardinal';
    await capture(tester, expandedFish, 'my-fish__expanded');

    for (final entry in <(FixtureScenario, String)>[
      (FixtureScenario.analyticsLoading, 'analytics__loading'),
      (FixtureScenario.analyticsEmpty, 'analytics__empty'),
      (FixtureScenario.analyticsError, 'analytics__error'),
      (FixtureScenario.populated, 'analytics__populated'),
    ]) {
      final controller = OceanEyesController()
        ..applyFixture(entry.$1, notify: false)
        ..activeTab = PrimaryTab.analytics;
      await capture(tester, controller, entry.$2);
    }

    for (final entry in <(FixtureScenario, String)>[
      (FixtureScenario.cameraPermission, 'account__permission'),
      (FixtureScenario.cameraDenied, 'account__denied'),
      (FixtureScenario.cameraUnavailable, 'account__unavailable'),
      (FixtureScenario.populated, 'account__active-camera'),
    ]) {
      final controller = OceanEyesController()
        ..applyFixture(entry.$1, notify: false)
        ..activeTab = PrimaryTab.account;
      await capture(tester, controller, entry.$2);
    }

    final disconnectedAccount = OceanEyesController()
      ..activeTab = PrimaryTab.account
      ..tankConnected = false
      ..cameraStage = CameraStage.unavailable;
    await capture(tester, disconnectedAccount, 'account__disconnected');

    final pairingSheet = OceanEyesController()
      ..activeTab = PrimaryTab.account
      ..tankConnected = false
      ..cameraStage = CameraStage.unavailable;
    await capture(
      tester,
      pairingSheet,
      'account__pairing-sheet',
      prepare: (tester, _) async {
        await tester.tap(find.text('Pair'));
        await pumpBounded(tester, duration: const Duration(milliseconds: 360));
        expect(
          find.byKey(const ValueKey('tank-pairing-sheet')),
          findsOneWidget,
        );
      },
    );

    final streamDisclosure = OceanEyesController()
      ..activeTab = PrimaryTab.account;
    await capture(
      tester,
      streamDisclosure,
      'account__stream-adjustments',
      prepare: (tester, _) async {
        final disclosure = find.text('Stream Image Adjustments');
        await tester.ensureVisible(disclosure);
        await tester.tap(disclosure);
        await pumpBounded(tester, duration: const Duration(milliseconds: 360));
        expect(find.text('Temperature (Cool / Warm)'), findsOneWidget);
        expect(find.text('Tint (Green / Magenta)'), findsOneWidget);
      },
    );

    final thresholdDisclosure = OceanEyesController()
      ..activeTab = PrimaryTab.account;
    await capture(
      tester,
      thresholdDisclosure,
      'account__alert-sensitivity',
      prepare: (tester, _) async {
        final disclosure = find.text('Alert sensitivity');
        await tester.scrollUntilVisible(
          disclosure,
          240,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(disclosure);
        await pumpBounded(tester, duration: const Duration(milliseconds: 360));
        expect(find.text('Maximum FNU Threshold'), findsOneWidget);
        expect(find.text('Discrepancy Alarm Trigger'), findsOneWidget);
      },
    );

    final aiPreferences = OceanEyesController()..activeTab = PrimaryTab.account;
    await capture(
      tester,
      aiPreferences,
      'account__ai-preferences',
      prepare: (tester, _) async {
        final disclosure = find.text('AI Preferences');
        await tester.scrollUntilVisible(
          disclosure,
          240,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(disclosure);
        await pumpBounded(tester, duration: const Duration(milliseconds: 360));
        expect(find.text('AI Polling Interval'), findsOneWidget);
        expect(find.text('Diagnosis Minimum Confidence'), findsOneWidget);
      },
    );

    final alertList = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..secondaryRoute = SecondaryRoute.alerts;
    await capture(tester, alertList, 'alerts__list');
    final alertEmpty = OceanEyesController()
      ..applyFixture(FixtureScenario.alertsEmpty, notify: false)
      ..secondaryRoute = SecondaryRoute.alerts;
    await capture(tester, alertEmpty, 'alerts__empty');
    final alertDetail = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..secondaryRoute = SecondaryRoute.alerts
      ..selectedAlertId = 'alert-turbidity';
    await capture(tester, alertDetail, 'alerts__detail');

    final history = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..secondaryRoute = SecondaryRoute.history;
    await capture(tester, history, 'history__populated');
    final historyEmpty = OceanEyesController()
      ..applyFixture(FixtureScenario.historyEmpty, notify: false)
      ..secondaryRoute = SecondaryRoute.history;
    await capture(tester, historyEmpty, 'history__empty');

    final addFish = OceanEyesController()..activeTab = PrimaryTab.myFish;
    await capture(
      tester,
      addFish,
      'my-fish__add-species-sheet',
      prepare: (tester, _) async {
        await tester.tap(find.text('Add fish'));
        await pumpBounded(tester, duration: const Duration(milliseconds: 240));
        expect(find.text('Search common or scientific name'), findsOneWidget);
      },
    );

    final countAdjusted = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..activeTab = PrimaryTab.myFish
      ..expandedFishId = 'fish-cardinal';
    await capture(
      tester,
      countAdjusted,
      'my-fish__count-adjusted',
      prepare: (tester, controller) async {
        final originalCount = controller.fish.first.count;
        await tester.tap(find.byTooltip('Increase fish count'));
        await pumpBounded(tester, duration: const Duration(milliseconds: 300));
        expect(controller.fish.first.count, originalCount + 1);
      },
    );

    final deleteFish = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..activeTab = PrimaryTab.myFish
      ..expandedFishId = 'fish-cardinal';
    await capture(
      tester,
      deleteFish,
      'my-fish__delete-confirmation',
      prepare: (tester, controller) async {
        await tester.tap(
          find.byTooltip('Delete ${controller.fish.first.name}'),
        );
        await pumpBounded(tester, duration: const Duration(milliseconds: 240));
        expect(find.text('Delete Fish Entry'), findsWidgets);
      },
    );

    final speciesSelector = OceanEyesController()
      ..activeTab = PrimaryTab.analytics;
    await capture(
      tester,
      speciesSelector,
      'analytics__species-selector',
      prepare: (tester, _) async {
        await tester.tap(
          find.byKey(const ValueKey('analytics-species-filter')),
        );
        await pumpBounded(tester, duration: const Duration(milliseconds: 240));
        expect(find.text('Filter by species'), findsOneWidget);
      },
    );

    final calendar = OceanEyesController()..activeTab = PrimaryTab.analytics;
    await capture(
      tester,
      calendar,
      'analytics__calendar',
      prepare: (tester, _) async {
        await tester.tap(find.byKey(const ValueKey('analytics-date-filter')));
        await pumpBounded(tester, duration: const Duration(milliseconds: 240));
        expect(find.text('Date & time range'), findsOneWidget);
        await tester.tap(find.text('Jul 31, 2026').first);
        await pumpBounded(tester, duration: const Duration(milliseconds: 240));
        expect(find.text('July 2026'), findsOneWidget);
      },
    );

    final timeWheel = OceanEyesController()..activeTab = PrimaryTab.analytics;
    await capture(
      tester,
      timeWheel,
      'analytics__time-wheel',
      prepare: (tester, _) async {
        await tester.tap(find.byKey(const ValueKey('analytics-date-filter')));
        await pumpBounded(tester, duration: const Duration(milliseconds: 240));
        await tester.tap(find.text('12:00 AM'));
        await pumpBounded(tester, duration: const Duration(milliseconds: 240));
        expect(find.byKey(const ValueKey('ocean-time-wheel')), findsOneWidget);
      },
    );

    final aiDisabled = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..activeTab = PrimaryTab.account
      ..aiEnabled = false;
    await capture(tester, aiDisabled, 'account__ai-disabled');

    final turbidity = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..activeTab = PrimaryTab.account;
    await capture(
      tester,
      turbidity,
      'account__turbidity-measuring',
      prepare: (tester, controller) async {
        await tester.tap(find.byTooltip('Measure water clarity'));
        await pumpBounded(tester, duration: const Duration(milliseconds: 120));
        expect(controller.cameraStage, CameraStage.measuringTurbidity);
      },
    );

    final fullscreen = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..activeTab = PrimaryTab.account
      ..fullscreenCamera = true;
    await capture(tester, fullscreen, 'account__fullscreen');

    final fullscreenInventory = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..activeTab = PrimaryTab.account
      ..fullscreenCamera = true
      ..inventoryDrawerOpen = true;
    await capture(tester, fullscreenInventory, 'account__fullscreen-inventory');

    final resolvedAlert = OceanEyesController()
      ..applyFixture(FixtureScenario.populated, notify: false)
      ..secondaryRoute = SecondaryRoute.alerts
      ..selectedAlertId = 'alert-turbidity';
    await capture(
      tester,
      resolvedAlert,
      'alerts__resolved',
      prepare: (tester, controller) async {
        final resolveButton = find.text('Mark Alert as Resolved');
        await tester.ensureVisible(resolveButton);
        await tester.pump(const Duration(milliseconds: 120));
        await tester.tap(resolveButton);
        await pumpBounded(tester, duration: const Duration(milliseconds: 360));
        expect(
          controller.alerts
              .singleWhere((alert) => alert.id == 'alert-turbidity')
              .resolved,
          isTrue,
        );
      },
    );

    tester.view.viewInsets = const FakeViewPadding(bottom: 280);
    final keyboard = OceanEyesController()..activeTab = PrimaryTab.myFish;
    await capture(
      tester,
      keyboard,
      'global__keyboard-add-fish',
      prepare: (tester, _) async {
        await tester.tap(find.text('Add fish'));
        await pumpBounded(tester, duration: const Duration(milliseconds: 240));
        expect(find.byType(TextField), findsOneWidget);
      },
    );
    tester.view.viewInsets = FakeViewPadding.zero;

    const safeArea = FakeViewPadding(top: 47, bottom: 34);
    tester.view.padding = safeArea;
    tester.view.viewPadding = safeArea;
    await capture(tester, OceanEyesController(), 'global__safe-area');
    tester.view.padding = FakeViewPadding.zero;
    tester.view.viewPadding = FakeViewPadding.zero;

    tester.platformDispatcher.textScaleFactorTestValue = 1.6;
    await capture(tester, OceanEyesController(), 'global__large-text');
    tester.platformDispatcher.clearTextScaleFactorTestValue();

    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    final reducedMotion = OceanEyesController()..activeTab = PrimaryTab.myFish;
    await capture(tester, reducedMotion, 'global__reduced-motion');
    tester.platformDispatcher.clearAccessibilityFeaturesTestValue();
  });
}
