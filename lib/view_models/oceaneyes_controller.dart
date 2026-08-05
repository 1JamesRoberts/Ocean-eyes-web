import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/analytics_series_service.dart';
import '../models/aquarium_models.dart';
import '../models/demo_fixtures.dart';
import '../models/fish_insights_service.dart';
import '../models/fish_inventory_repository.dart';
import '../models/oceaneyes_settings_repository.dart';

class OceanEyesController extends ChangeNotifier {
  OceanEyesController({
    SharedPreferences? preferences,
    FishInventoryRepository? inventoryRepository,
    OceanEyesSettingsRepository? settingsRepository,
    Uri? launchUri,
    bool requireLogin = false,
  }) : _inventoryRepository =
           inventoryRepository ??
           (preferences == null
               ? null
               : SharedPreferencesFishInventoryRepository(preferences)),
       _settingsRepository =
           settingsRepository ??
           (preferences == null
               ? null
               : SharedPreferencesOceanEyesSettingsRepository(preferences)) {
    final uri = launchUri ?? Uri.base;
    final requestedFixture = uri.queryParameters['fixture'];
    final forceLogin =
        requestedFixture?.toLowerCase().replaceAll('-', '_') == 'login' ||
        uri.queryParameters['route'] == 'login';
    isAuthenticated =
        !(forceLogin || (requireLogin && requestedFixture == null));
    if (requestedFixture == null || forceLogin) {
      _restorePreferences();
    } else {
      applyFixtureName(requestedFixture, notify: false);
    }
    final requestedTab = uri.queryParameters['tab'];
    activeTab = switch (requestedTab) {
      'my_fish' || 'fish' => PrimaryTab.myFish,
      'analytics' => PrimaryTab.analytics,
      'account' => PrimaryTab.account,
      _ => PrimaryTab.dashboard,
    };
    final requestedRoute = uri.queryParameters['route'];
    if (requestedRoute == 'alerts') {
      secondaryOrigin = activeTab;
      secondaryRoute = SecondaryRoute.alerts;
    } else if (requestedRoute == 'history') {
      secondaryOrigin = activeTab;
      secondaryRoute = SecondaryRoute.history;
    }
    final requestedAlert = uri.queryParameters['alert'];
    if (secondaryRoute == SecondaryRoute.alerts && requestedAlert != null) {
      selectedAlertId = requestedAlert;
    }
  }

  static Future<OceanEyesController> bootstrap() async {
    final preferences = await SharedPreferences.getInstance();
    return OceanEyesController(
      preferences: preferences,
      inventoryRepository: SharedPreferencesFishInventoryRepository(
        preferences,
      ),
      settingsRepository: SharedPreferencesOceanEyesSettingsRepository(
        preferences,
      ),
      requireLogin: true,
    );
  }

  final FishInventoryRepository? _inventoryRepository;
  final OceanEyesSettingsRepository? _settingsRepository;
  Future<void> _inventoryWriteQueue = Future<void>.value();
  Future<void> _settingsWriteQueue = Future<void>.value();
  bool _disposed = false;

  PrimaryTab activeTab = PrimaryTab.dashboard;
  SecondaryRoute? secondaryRoute;
  String? selectedAlertId;
  PrimaryTab secondaryOrigin = PrimaryTab.dashboard;
  int scrollEpoch = 0;
  bool _addFishRequestPending = false;
  bool _analyticsSpeciesRequestPending = false;
  bool _analyticsRangeRequestPending = false;

  bool isAuthenticated = true;
  bool isAuthenticating = false;

  FixtureScenario fixtureScenario = FixtureScenario.dashboardWaiting;
  DashboardHealthState dashboardHealth = DashboardHealthState.waiting;
  AnalyticsContentState analyticsState = AnalyticsContentState.empty;
  CameraStage cameraStage = CameraStage.beforePermission;
  bool cameraPermissionWillGrant = true;

  List<FishEntry> fish = const [];
  List<AlertItem> alerts = const [];
  List<HistoryReading> history = const [];
  List<NormalizedDetectionCenter> heatmapCenters = const [];
  DetectionFrameDimensions heatmapSourceDimensions =
      DemoFixtures.heatmapSourceDimensions;

  String? expandedFishId;
  String selectedSpecies = 'All species';
  DateTimeRange analyticsRange = DateTimeRange(
    start: DateTime(2026, 7, 31),
    end: DateTime(2026, 7, 31, 23, 59),
  );
  TimeOfDay analyticsStartTime = const TimeOfDay(hour: 0, minute: 0);
  TimeOfDay analyticsEndTime = const TimeOfDay(hour: 23, minute: 59);

  bool aiEnabled = true;
  bool showDetections = true;
  bool inventoryDrawerOpen = false;
  bool fullscreenCamera = false;
  bool tankSectionOpen = false;
  bool streamSectionOpen = false;
  bool thresholdSectionOpen = false;
  bool aiPreferencesOpen = false;
  bool debugSectionOpen = false;
  double brightness = 1;
  double contrast = 1;
  double saturation = 1;
  double temperature = 0;
  double tint = 0;
  bool autoConnect = false;
  double pollingIntervalMs = 10000;
  double detectionConfidenceThreshold = 0.35;
  double speciesConfidenceThreshold = 0.35;
  double diagnosisMinConfidence = 0.60;
  double clarityThreshold = 5;
  double visibleFishThreshold = 50;
  double ambientBlur = 48;
  double ambientOpacity = 1;
  double ambientBaseGrey = 255;
  double ambientFadeStart = 50;
  double ambientFadeEnd = 100;
  double heroFadeStart = 70;
  String? lastTurbidityResult = '1.5 FNU';
  String tankName = 'Living Room Reef';
  bool tankConnected = true;
  bool usingFrontCamera = false;

  Future<void> signInWithGoogle() async {
    if (isAuthenticated || isAuthenticating) return;
    isAuthenticating = true;
    _notify();
    await Future<void>.delayed(const Duration(milliseconds: 650));
    if (_disposed) return;
    isAuthenticating = false;
    isAuthenticated = true;
    _notify();
  }

  int get totalFish => fish.fold(0, (sum, entry) => sum + entry.count);
  int get detectedFish => fish.fold(0, (sum, entry) => sum + entry.detected);
  List<WaterMetric> get waterMetrics =>
      dashboardHealth == DashboardHealthState.warning
      ? DemoFixtures.warningWaterMetrics
      : DemoFixtures.waterMetrics;
  List<SpeciesOption> get availableSpecies => DemoFixtures.species;
  List<ChartPoint> get claritySeries => DemoFixtures.claritySeries;
  List<ChartPoint> get fishCountPoints =>
      AnalyticsSeriesService.fishCount(fish, selectedSpecies);
  List<ChartPoint> get spreadPoints =>
      AnalyticsSeriesService.spread(fish, selectedSpecies);
  List<FishDiagnostic> get fishDiagnostics =>
      AnalyticsSeriesService.diagnostics(fish, selectedSpecies);
  List<NormalizedDetectionCenter> get selectedHeatmapCenters {
    if (selectedSpecies == 'All species') return heatmapCenters;

    String? selectedSpeciesId;
    for (final entry in fish) {
      if (entry.name == selectedSpecies) {
        selectedSpeciesId = entry.speciesId;
        break;
      }
    }
    if (selectedSpeciesId == null) return const [];

    return heatmapCenters
        .where((center) => center.speciesId == selectedSpeciesId)
        .toList(growable: false);
  }

  TankStats get tankStats => FishInsightsService.tankStats(fish);
  SpeciesFacts? speciesFactsFor(String speciesId) =>
      FishInsightsService.factsFor(speciesId);
  List<FishCompatibility> compatibilitiesFor(String fishId) =>
      FishInsightsService.compatibilitiesFor(fish, fishId);
  int get unresolvedAlertCount =>
      alerts.where((alert) => !alert.resolved).length;
  AlertItem? get selectedAlert {
    for (final alert in alerts) {
      if (alert.id == selectedAlertId) return alert;
    }
    return null;
  }

  void selectTab(PrimaryTab tab) {
    activeTab = tab;
    secondaryRoute = null;
    selectedAlertId = null;
    scrollEpoch += 1;
    _notify();
  }

  void openAlerts() {
    secondaryOrigin = PrimaryTab.dashboard;
    secondaryRoute = SecondaryRoute.alerts;
    selectedAlertId = null;
    scrollEpoch += 1;
    _notify();
  }

  void requestAddFish() {
    if (activeTab != PrimaryTab.myFish) {
      activeTab = PrimaryTab.myFish;
      secondaryRoute = null;
      selectedAlertId = null;
      scrollEpoch += 1;
    }
    _addFishRequestPending = true;
    _notify();
  }

  /// Consumes a one-shot request to present the add-fish sheet.
  ///
  /// No notification is emitted: the request is consumed while the receiving
  /// screen handles the controller notification that created it.
  bool consumeAddFishRequest() {
    if (!_addFishRequestPending) return false;
    _addFishRequestPending = false;
    return true;
  }

  void requestAnalyticsSpecies() {
    _analyticsSpeciesRequestPending = true;
    _notify();
  }

  bool consumeAnalyticsSpeciesRequest() {
    if (!_analyticsSpeciesRequestPending) return false;
    _analyticsSpeciesRequestPending = false;
    return true;
  }

  void requestAnalyticsRange() {
    _analyticsRangeRequestPending = true;
    _notify();
  }

  bool consumeAnalyticsRangeRequest() {
    if (!_analyticsRangeRequestPending) return false;
    _analyticsRangeRequestPending = false;
    return true;
  }

  void openHistory() {
    secondaryOrigin = PrimaryTab.dashboard;
    secondaryRoute = SecondaryRoute.history;
    selectedAlertId = null;
    scrollEpoch += 1;
    _notify();
  }

  void openAlertDetail(String id) {
    if (secondaryRoute != SecondaryRoute.alerts) {
      secondaryOrigin = activeTab;
    }
    secondaryRoute = SecondaryRoute.alerts;
    selectedAlertId = id;
    scrollEpoch += 1;
    _notify();
  }

  void popAlertDetail() {
    if (selectedAlertId == null) return;
    selectedAlertId = null;
    scrollEpoch += 1;
    _notify();
  }

  void closeSecondaryRoute() {
    selectedAlertId = null;
    secondaryRoute = null;
    activeTab = secondaryOrigin;
    scrollEpoch += 1;
    _notify();
  }

  void toggleFishExpanded(String id) {
    expandedFishId = expandedFishId == id ? null : id;
    _notify();
  }

  void adjustFishCount(String id, int delta) {
    fish = fish
        .map((entry) {
          if (entry.id != id) return entry;
          final nextCount = (entry.count + delta).clamp(1, 99);
          return entry.copyWith(
            count: nextCount,
            detected: entry.detected.clamp(0, nextCount),
          );
        })
        .toList(growable: false);
    _savePreferences();
    _notify();
  }

  void toggleFishVisibility(String id) {
    fish = fish
        .map(
          (entry) =>
              entry.id == id ? entry.copyWith(visible: !entry.visible) : entry,
        )
        .toList(growable: false);
    _savePreferences();
    _notify();
  }

  void addSpecies(SpeciesOption species) {
    final existingIndex = fish.indexWhere(
      (entry) => entry.speciesId == species.id,
    );
    if (existingIndex >= 0) {
      adjustFishCount(fish[existingIndex].id, 1);
      return;
    }
    fish = [
      ...fish,
      FishEntry(
        id: 'fish-${species.id}',
        speciesId: species.id,
        name: species.name,
        scientificName: species.scientificName,
        assetPath: species.assetPath,
        count: 1,
        detected: 0,
        compatibility: species.compatibility,
        careLevel: species.careLevel,
      ),
    ];
    _savePreferences();
    _notify();
  }

  void deleteFish(String id) {
    final removedSelectedSpecies = fish.any(
      (entry) => entry.id == id && entry.name == selectedSpecies,
    );
    fish = fish.where((entry) => entry.id != id).toList(growable: false);
    if (expandedFishId == id) expandedFishId = null;
    if (removedSelectedSpecies) selectedSpecies = 'All species';
    _savePreferences();
    _notify();
  }

  void setSelectedSpecies(String value) {
    selectedSpecies = value;
    _notify();
  }

  void setAnalyticsRange(
    DateTimeRange range, {
    TimeOfDay? start,
    TimeOfDay? end,
  }) {
    analyticsRange = range;
    analyticsStartTime = start ?? analyticsStartTime;
    analyticsEndTime = end ?? analyticsEndTime;
    _notify();
  }

  void retryAnalytics() {
    analyticsState = AnalyticsContentState.loading;
    heatmapCenters = const [];
    _notify();
    unawaited(
      _completeAfter(const Duration(milliseconds: 650), () {
        analyticsState = AnalyticsContentState.populated;
        heatmapCenters = DemoFixtures.heatmapCenters;
      }),
    );
  }

  Future<void> requestCameraPermission() async {
    cameraStage = CameraStage.requestingPermission;
    _notify();
    await Future<void>.delayed(const Duration(milliseconds: 500));
    if (_disposed) return;
    cameraStage = cameraPermissionWillGrant
        ? CameraStage.active
        : CameraStage.denied;
    _notify();
  }

  void retryCamera() {
    cameraPermissionWillGrant = true;
    unawaited(requestCameraPermission());
  }

  void setCameraStage(CameraStage stage) {
    cameraStage = stage;
    _notify();
  }

  void switchCamera() {
    usingFrontCamera = !usingFrontCamera;
    _savePreferences();
    _notify();
  }

  void toggleAI(bool enabled) {
    aiEnabled = enabled;
    if (enabled && cameraStage == CameraStage.active) {
      cameraStage = CameraStage.aiProcessing;
      _notify();
      unawaited(
        _completeAfter(const Duration(milliseconds: 900), () {
          cameraStage = CameraStage.active;
        }),
      );
      return;
    }
    _savePreferences();
    _notify();
  }

  void measureTurbidity() {
    cameraStage = CameraStage.measuringTurbidity;
    lastTurbidityResult = null;
    _notify();
    unawaited(
      _completeAfter(const Duration(milliseconds: 1100), () {
        cameraStage = CameraStage.active;
        lastTurbidityResult = '1.5 FNU';
      }),
    );
  }

  void setFullscreenCamera(bool value) {
    fullscreenCamera = value;
    if (!value) inventoryDrawerOpen = false;
    _notify();
  }

  void toggleInventoryDrawer() {
    inventoryDrawerOpen = !inventoryDrawerOpen;
    _notify();
  }

  void renameTank(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty || trimmed == tankName) return;
    tankName = trimmed;
    _savePreferences();
    _notify();
  }

  void disconnectTank() {
    tankConnected = false;
    cameraStage = CameraStage.unavailable;
    fullscreenCamera = false;
    inventoryDrawerOpen = false;
    _savePreferences();
    _notify();
  }

  void connectDemoTank() {
    tankConnected = true;
    cameraStage = CameraStage.active;
    _savePreferences();
    _notify();
  }

  void resolveAlert(String id) {
    alerts = alerts
        .map((alert) => alert.id == id ? alert.copyWith(resolved: true) : alert)
        .toList(growable: false);
    _notify();
  }

  void setDisclosure(String section, bool value) {
    switch (section) {
      case 'tank':
        tankSectionOpen = value;
        break;
      case 'stream':
        streamSectionOpen = value;
        break;
      case 'threshold':
        thresholdSectionOpen = value;
        break;
      case 'ai':
        aiPreferencesOpen = value;
        break;
      case 'debug':
        debugSectionOpen = value;
        break;
    }
    _notify();
  }

  void previewSetting(String name, double value) {
    _applySetting(name, value);
    _notify();
  }

  void commitSetting(String name, double value) {
    _applySetting(name, value);
    _savePreferences();
    _notify();
  }

  /// Backwards-compatible single-step update used by non-drag controls.
  void updateSetting(String name, double value) => commitSetting(name, value);

  void _applySetting(String name, double value) {
    switch (name) {
      case 'brightness':
        brightness = value;
        break;
      case 'contrast':
        contrast = value;
        break;
      case 'saturation':
        saturation = value;
        break;
      case 'temperature':
        temperature = value;
        break;
      case 'tint':
        tint = value;
        break;
      case 'pollingIntervalMs':
        pollingIntervalMs = value;
        break;
      case 'detectionConfidenceThreshold':
        detectionConfidenceThreshold = value;
        break;
      case 'speciesConfidenceThreshold':
        speciesConfidenceThreshold = value;
        break;
      case 'diagnosisMinConfidence':
        diagnosisMinConfidence = value;
        break;
      case 'clarityThreshold':
        clarityThreshold = value;
        break;
      case 'visibleFishThreshold':
        visibleFishThreshold = value;
        break;
      case 'ambientBlur':
        ambientBlur = value;
        break;
      case 'ambientOpacity':
        ambientOpacity = value;
        break;
      case 'ambientBaseGrey':
        ambientBaseGrey = value.round().clamp(0, 255).toDouble();
        break;
      case 'ambientFadeStart':
        ambientFadeStart = value
            .round()
            .clamp(0, math.min(80, ambientFadeEnd - 5).round())
            .toDouble();
        break;
      case 'ambientFadeEnd':
        ambientFadeEnd = value
            .round()
            .clamp(math.max(20, ambientFadeStart + 5).round(), 100)
            .toDouble();
        break;
      case 'heroFadeStart':
        heroFadeStart = value.round().clamp(0, 80).toDouble();
        break;
    }
  }

  void setShowDetections(bool value) {
    showDetections = value;
    _savePreferences();
    _notify();
  }

  void setAutoConnect(bool value) {
    autoConnect = value;
    _savePreferences();
    _notify();
  }

  void resetAmbientCanvas() {
    ambientBaseGrey = 255;
    ambientOpacity = 1;
    ambientBlur = 48;
    ambientFadeStart = 50;
    ambientFadeEnd = 100;
    heroFadeStart = 70;
    _notify();
  }

  void applyFixture(FixtureScenario scenario, {bool notify = true}) {
    fixtureScenario = scenario;
    selectedSpecies = 'All species';
    analyticsRange = DateTimeRange(
      start: DateTime(2026, 7, 31),
      end: DateTime(2026, 7, 31, 23, 59),
    );
    analyticsStartTime = const TimeOfDay(hour: 0, minute: 0);
    analyticsEndTime = const TimeOfDay(hour: 23, minute: 59);
    dashboardHealth = DashboardHealthState.healthy;
    analyticsState = AnalyticsContentState.populated;
    cameraStage = CameraStage.active;
    cameraPermissionWillGrant = true;
    aiEnabled = true;
    showDetections = true;
    inventoryDrawerOpen = false;
    fullscreenCamera = false;
    tankSectionOpen = false;
    streamSectionOpen = false;
    thresholdSectionOpen = false;
    aiPreferencesOpen = false;
    debugSectionOpen = false;
    brightness = 1;
    contrast = 1;
    saturation = 1;
    temperature = 0;
    tint = 0;
    autoConnect = false;
    pollingIntervalMs = 10000;
    detectionConfidenceThreshold = 0.35;
    speciesConfidenceThreshold = 0.35;
    diagnosisMinConfidence = 0.60;
    clarityThreshold = 5;
    visibleFishThreshold = 50;
    ambientBlur = 48;
    ambientOpacity = 1;
    ambientBaseGrey = 255;
    ambientFadeStart = 50;
    ambientFadeEnd = 100;
    heroFadeStart = 70;
    lastTurbidityResult = '1.5 FNU';
    tankName = 'Living Room Reef';
    tankConnected = true;
    usingFrontCamera = false;
    fish = DemoFixtures.populatedFish();
    alerts = DemoFixtures.alerts();
    history = DemoFixtures.history();
    heatmapCenters = DemoFixtures.heatmapCenters;
    heatmapSourceDimensions = DemoFixtures.heatmapSourceDimensions;

    switch (scenario) {
      case FixtureScenario.populated:
        break;
      case FixtureScenario.dashboardWaiting:
        dashboardHealth = DashboardHealthState.waiting;
        analyticsState = AnalyticsContentState.empty;
        aiEnabled = false;
        lastTurbidityResult = null;
        fish = [];
        alerts = [];
        history = [];
        heatmapCenters = const [];
        break;
      case FixtureScenario.dashboardWarning:
        dashboardHealth = DashboardHealthState.warning;
        break;
      case FixtureScenario.fishEmpty:
        aiEnabled = false;
        lastTurbidityResult = null;
        fish = [];
        alerts = [];
        break;
      case FixtureScenario.analyticsLoading:
        analyticsState = AnalyticsContentState.loading;
        heatmapCenters = const [];
        break;
      case FixtureScenario.analyticsEmpty:
        analyticsState = AnalyticsContentState.empty;
        aiEnabled = false;
        lastTurbidityResult = null;
        analyticsRange = DateTimeRange(
          start: DateTime(2026, 8, 5),
          end: DateTime(2026, 8, 5, 23, 59),
        );
        fish = [];
        alerts = [];
        history = [];
        heatmapCenters = const [];
        break;
      case FixtureScenario.analyticsError:
        analyticsState = AnalyticsContentState.error;
        heatmapCenters = const [];
        break;
      case FixtureScenario.cameraPermission:
        cameraStage = CameraStage.beforePermission;
        break;
      case FixtureScenario.cameraDenied:
        cameraStage = CameraStage.denied;
        cameraPermissionWillGrant = false;
        break;
      case FixtureScenario.cameraUnavailable:
        cameraStage = CameraStage.unavailable;
        break;
      case FixtureScenario.alertsEmpty:
        aiEnabled = false;
        lastTurbidityResult = null;
        fish = [];
        alerts = [];
        history = [];
        break;
      case FixtureScenario.historyEmpty:
        aiEnabled = false;
        lastTurbidityResult = null;
        fish = [];
        alerts = [];
        history = [];
        break;
    }
    expandedFishId = null;
    selectedAlertId = null;
    _addFishRequestPending = false;
    _analyticsSpeciesRequestPending = false;
    _analyticsRangeRequestPending = false;
    scrollEpoch += 1;
    if (notify) _notify();
  }

  void applyFixtureName(String fixture, {bool notify = true}) {
    final normalized = fixture.toLowerCase().replaceAll('-', '_');
    final scenario = switch (normalized) {
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
    applyFixture(scenario, notify: notify);
  }

  Future<void> _completeAfter(Duration duration, VoidCallback mutate) async {
    await Future<void>.delayed(duration);
    if (_disposed) return;
    mutate();
    _savePreferences();
    _notify();
  }

  void _restorePreferences() {
    fish = _inventoryRepository?.load() ?? fish;
    final settings = _settingsRepository?.load();
    if (settings == null) return;
    aiEnabled = settings.aiEnabled;
    showDetections = settings.showDetections;
    brightness = settings.brightness;
    contrast = settings.contrast;
    saturation = settings.saturation;
    temperature = settings.temperature;
    tint = settings.tint;
    autoConnect = settings.autoConnect;
    pollingIntervalMs = settings.pollingIntervalMs;
    detectionConfidenceThreshold = settings.detectionConfidenceThreshold;
    speciesConfidenceThreshold = settings.speciesConfidenceThreshold;
    diagnosisMinConfidence = settings.diagnosisMinConfidence;
    clarityThreshold = settings.clarityThreshold;
    visibleFishThreshold = settings.visibleFishThreshold;
    ambientBlur = settings.ambientBlur;
    ambientOpacity = settings.ambientOpacity;
    tankName = settings.tankName;
    tankConnected = settings.tankConnected;
    usingFrontCamera = settings.usingFrontCamera;
    if (!tankConnected) cameraStage = CameraStage.unavailable;
  }

  void _savePreferences() {
    final inventoryRepository = _inventoryRepository;
    if (inventoryRepository != null) {
      final snapshot = List<FishEntry>.unmodifiable(fish);
      _inventoryWriteQueue = _inventoryWriteQueue.then(
        (_) => inventoryRepository.save(snapshot),
      );
    }

    final settingsRepository = _settingsRepository;
    if (settingsRepository != null) {
      final snapshot = OceanEyesSettings(
        aiEnabled: aiEnabled,
        showDetections: showDetections,
        brightness: brightness,
        contrast: contrast,
        saturation: saturation,
        temperature: temperature,
        tint: tint,
        autoConnect: autoConnect,
        pollingIntervalMs: pollingIntervalMs,
        detectionConfidenceThreshold: detectionConfidenceThreshold,
        speciesConfidenceThreshold: speciesConfidenceThreshold,
        diagnosisMinConfidence: diagnosisMinConfidence,
        clarityThreshold: clarityThreshold,
        visibleFishThreshold: visibleFishThreshold,
        ambientBlur: ambientBlur,
        ambientOpacity: ambientOpacity,
        tankName: tankName,
        tankConnected: tankConnected,
        usingFrontCamera: usingFrontCamera,
      );
      _settingsWriteQueue = _settingsWriteQueue.then(
        (_) => settingsRepository.save(snapshot),
      );
    }
  }

  /// Waits for queued model-layer writes, primarily for lifecycle hooks/tests.
  Future<void> flushPersistence() async {
    await Future.wait([_inventoryWriteQueue, _settingsWriteQueue]);
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
