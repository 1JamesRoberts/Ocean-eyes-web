import 'package:flutter/material.dart';

import '../models/aquarium_models.dart';
import '../models/demo_fixtures.dart';

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
