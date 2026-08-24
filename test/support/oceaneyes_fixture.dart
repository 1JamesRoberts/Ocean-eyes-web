import 'dart:async';

import 'package:flutter/material.dart';
import 'package:oceaneyes/models/analytics_series_service.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

import 'demo_fixtures.dart';

export 'demo_fixtures.dart';

enum FixtureScenario {
  populated,
  dashboardWaiting,
  dashboardWarning,
  fishEmpty,
  analyticsLoading,
  analyticsEmpty,
  analyticsError,
  cameraPermission,
  cameraDenied,
  cameraUnavailable,
  alertsEmpty,
  historyEmpty,
}

/// Builds deterministic presentation snapshots without touching production
/// gateways or persisted state.
class OceanEyesFixtureCoordinator {
  const OceanEyesFixtureCoordinator();

  FixtureScenario resolveName(String fixture) {
    final normalized = fixture.toLowerCase().replaceAll('-', '_');
    return switch (normalized) {
      'dashboard_waiting' || 'waiting' => FixtureScenario.dashboardWaiting,
      'dashboard_warning' || 'warning' => FixtureScenario.dashboardWarning,
      'fish_empty' || 'my_fish_empty' => FixtureScenario.fishEmpty,
      'analytics_loading' => FixtureScenario.analyticsLoading,
      'analytics_empty' => FixtureScenario.analyticsEmpty,
      'analytics_error' => FixtureScenario.analyticsError,
      'camera_permission' => FixtureScenario.cameraPermission,
      'camera_denied' => FixtureScenario.cameraDenied,
      'camera_unavailable' => FixtureScenario.cameraUnavailable,
      'alerts_empty' => FixtureScenario.alertsEmpty,
      'history_empty' => FixtureScenario.historyEmpty,
      _ => FixtureScenario.populated,
    };
  }

  OceanEyesFixtureSnapshot build(FixtureScenario scenario) {
    var dashboardHealth = DashboardHealthState.healthy;
    var analyticsState = AnalyticsContentState.populated;
    var cameraStage = CameraStage.active;
    var cameraPermissionWillGrant = true;
    var aiEnabled = true;
    String? lastTurbidityResult = '1.5 FNU';
    var analyticsRange = DateTimeRange(
      start: DateTime(2026, 7, 31),
      end: DateTime(2026, 7, 31, 23, 59),
    );
    List<FishEntry> fish = DemoFixtures.populatedFish();
    List<AlertItem> alerts = DemoFixtures.alerts();
    List<HistoryReading> history = DemoFixtures.history();
    List<NormalizedDetectionCenter> heatmapCenters =
        DemoFixtures.heatmapCenters;

    switch (scenario) {
      case FixtureScenario.populated:
        break;
      case FixtureScenario.dashboardWaiting:
        dashboardHealth = DashboardHealthState.waiting;
        analyticsState = AnalyticsContentState.empty;
        aiEnabled = false;
        lastTurbidityResult = null;
        fish = const [];
        alerts = const [];
        history = const [];
        heatmapCenters = const [];
      case FixtureScenario.dashboardWarning:
        dashboardHealth = DashboardHealthState.warning;
      case FixtureScenario.fishEmpty:
        aiEnabled = false;
        lastTurbidityResult = null;
        fish = const [];
        alerts = const [];
      case FixtureScenario.analyticsLoading:
        analyticsState = AnalyticsContentState.loading;
        heatmapCenters = const [];
      case FixtureScenario.analyticsEmpty:
        analyticsState = AnalyticsContentState.empty;
        aiEnabled = false;
        lastTurbidityResult = null;
        analyticsRange = DateTimeRange(
          start: DateTime(2026, 8, 5),
          end: DateTime(2026, 8, 5, 23, 59),
        );
        fish = const [];
        alerts = const [];
        history = const [];
        heatmapCenters = const [];
      case FixtureScenario.analyticsError:
        analyticsState = AnalyticsContentState.error;
        heatmapCenters = const [];
      case FixtureScenario.cameraPermission:
        cameraStage = CameraStage.beforePermission;
      case FixtureScenario.cameraDenied:
        cameraStage = CameraStage.denied;
        cameraPermissionWillGrant = false;
      case FixtureScenario.cameraUnavailable:
        cameraStage = CameraStage.unavailable;
      case FixtureScenario.alertsEmpty:
      case FixtureScenario.historyEmpty:
        aiEnabled = false;
        lastTurbidityResult = null;
        fish = const [];
        alerts = const [];
        history = const [];
    }

    return OceanEyesFixtureSnapshot(
      scenario: scenario,
      dashboardHealth: dashboardHealth,
      analyticsState: analyticsState,
      cameraStage: cameraStage,
      cameraPermissionWillGrant: cameraPermissionWillGrant,
      aiEnabled: aiEnabled,
      lastTurbidityResult: lastTurbidityResult,
      analyticsRange: analyticsRange,
      fish: fish,
      alerts: alerts,
      history: history,
      heatmapCenters: heatmapCenters,
    );
  }
}

class OceanEyesFixtureSnapshot {
  const OceanEyesFixtureSnapshot({
    required this.scenario,
    required this.dashboardHealth,
    required this.analyticsState,
    required this.cameraStage,
    required this.cameraPermissionWillGrant,
    required this.aiEnabled,
    required this.lastTurbidityResult,
    required this.analyticsRange,
    required this.fish,
    required this.alerts,
    required this.history,
    required this.heatmapCenters,
  });

  final FixtureScenario scenario;
  final DashboardHealthState dashboardHealth;
  final AnalyticsContentState analyticsState;
  final CameraStage cameraStage;
  final bool cameraPermissionWillGrant;
  final bool aiEnabled;
  final String? lastTurbidityResult;
  final DateTimeRange analyticsRange;
  final List<FishEntry> fish;
  final List<AlertItem> alerts;
  final List<HistoryReading> history;
  final List<NormalizedDetectionCenter> heatmapCenters;
}

class FixtureOceanEyesController extends OceanEyesController {
  FixtureOceanEyesController({
    super.preferences,
    super.inventoryRepository,
    super.settingsRepository,
    super.onboardingRepository,
    Uri? launchUri,
  }) : super(launchUri: launchUri, localPreviewEnabled: true) {
    final fixture = launchUri?.queryParameters['fixture'];
    isAuthenticated =
        fixture != 'login' && launchUri?.queryParameters['route'] != 'login';
    if (fixture == 'login') {
      activeTankId = 'tank-demo';
      tankConnected = true;
    } else if (fixture != null) {
      applyFixtureName(fixture, notify: false);
    } else if (fixture == null) {
      applyFixture(FixtureScenario.populated, notify: false);
    }
  }

  static const _fixtures = OceanEyesFixtureCoordinator();
  FixtureScenario fixtureScenario = FixtureScenario.dashboardWaiting;
  List<WaterMetric> _fixtureWaterMetrics = DemoFixtures.waterMetrics;

  @override
  List<WaterMetric> get waterMetrics => _fixtureWaterMetrics;

  @override
  List<ChartPoint> get claritySeries => AnalyticsSeriesService.filterByRange(
    DemoFixtures.claritySeries,
    rangeStart: analyticsRange.start,
    rangeEnd: analyticsRange.end,
  );

  @override
  List<ChartPoint> get fishCountPoints {
    final source = AnalyticsSeriesService.filterByRange(
      DemoFixtures.fishCountSeries,
      rangeStart: analyticsRange.start,
      rangeEnd: analyticsRange.end,
    );
    if (source.isEmpty || selectedSpecies == 'All species') return source;
    final selectedIndex = fish.indexWhere(
      (entry) => entry.name == selectedSpecies,
    );
    if (selectedIndex < 0) return const [];
    final total = fish.fold<int>(0, (sum, entry) => sum + entry.count);
    if (total == 0) return const [];
    final ratio = fish[selectedIndex].count / total;
    return source
        .map(
          (point) => ChartPoint(
            point.label,
            (point.value * ratio).roundToDouble(),
            timestamp: point.timestamp,
          ),
        )
        .toList(growable: false);
  }

  @override
  List<ChartPoint> get spreadPoints {
    final source = AnalyticsSeriesService.filterByRange(
      DemoFixtures.spreadSeries,
      rangeStart: analyticsRange.start,
      rangeEnd: analyticsRange.end,
    );
    if (source.isEmpty || selectedSpecies == 'All species') return source;
    final selectedIndex = fish.indexWhere(
      (entry) => entry.name == selectedSpecies,
    );
    if (selectedIndex < 0) return const [];
    final factor = 0.82 + selectedIndex * 0.04;
    return source
        .map(
          (point) => ChartPoint(
            point.label,
            double.parse((point.value * factor).toStringAsFixed(1)),
            timestamp: point.timestamp,
          ),
        )
        .toList(growable: false);
  }

  @override
  List<FishDiagnostic> get fishDiagnostics {
    final selected = selectedSpecies == 'All species'
        ? fish.take(2)
        : fish.where((entry) => entry.name == selectedSpecies);
    return selected.indexed
        .map(
          (entry) => FishDiagnostic(
            fish: entry.$2,
            status: 'Healthy',
            confidence: 96 - entry.$1 * 3,
            scannedAt: DateTime(
              2026,
              7,
              31,
              10,
              42,
            ).subtract(Duration(minutes: entry.$1 * 17)),
            observation:
                'Color, posture, and fin movement are consistent with healthy '
                'behavior.',
          ),
        )
        .where(
          (diagnostic) =>
              !diagnostic.scannedAt.isBefore(analyticsRange.start) &&
              !diagnostic.scannedAt.isAfter(analyticsRange.end),
        )
        .toList(growable: false);
  }

  @override
  bool get canEditTankSettings => true;

  @override
  bool get canCalibrateTank => true;

  @override
  Future<void> signInWithGoogle() async {
    isAuthenticating = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 650));
    isAuthenticating = false;
    isAuthenticated = true;
    notifyListeners();
  }

  @override
  Future<void> requestCameraPermission() async {
    cameraStage = CameraStage.active;
    notifyListeners();
  }

  @override
  void retryCamera() {
    unawaited(requestCameraPermission());
  }

  @override
  void switchCamera() {
    usingFrontCamera = !usingFrontCamera;
    notifyListeners();
  }

  @override
  void toggleAI(bool enabled) {
    aiEnabled = enabled;
    notifyListeners();
  }

  @override
  void measureTurbidity() {
    cameraStage = CameraStage.active;
    lastTurbidityResult = '1.5 FNU';
    notifyListeners();
  }

  void applyFixtureName(String fixture, {bool notify = true}) =>
      applyFixture(_fixtures.resolveName(fixture), notify: notify);

  void applyFixture(FixtureScenario scenario, {bool notify = true}) {
    final snapshot = _fixtures.build(scenario);
    fixtureScenario = scenario;
    selectedSpecies = 'All species';
    dashboardHealth = snapshot.dashboardHealth;
    analyticsState = snapshot.analyticsState;
    cameraStage = snapshot.cameraStage;
    cameraPermissionWillGrant = snapshot.cameraPermissionWillGrant;
    aiEnabled = snapshot.aiEnabled;
    lastTurbidityResult = snapshot.lastTurbidityResult;
    analyticsRange = snapshot.analyticsRange;
    fish = snapshot.fish;
    alerts = snapshot.alerts;
    history = snapshot.history;
    heatmapCenters = snapshot.heatmapCenters;
    heatmapSourceDimensions = DemoFixtures.heatmapSourceDimensions;
    activeTankId = 'tank-demo';
    tankName = 'Living Room Reef';
    tankConnected = true;
    _fixtureWaterMetrics = scenario == FixtureScenario.dashboardWarning
        ? DemoFixtures.warningWaterMetrics
        : DemoFixtures.waterMetrics;
    if (notify) notifyListeners();
  }
}
