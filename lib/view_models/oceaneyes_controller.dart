import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../integrations/camera/camera_capture_gateway.dart';
import '../integrations/firebase/firebase_notification_service.dart';
import '../integrations/livekit/livekit_gateway.dart';
import '../integrations/ml/onnx_fish_inference.dart';
import '../integrations/power/wake_lock_gateway.dart';
import '../models/analytics_series_service.dart';
import '../models/aquarium_models.dart';
import '../models/demo_fixtures.dart';
import '../models/fish_insights_service.dart';
import '../models/fish_inventory_repository.dart';
import '../models/oceaneyes_settings_repository.dart';
import '../models/production_auth.dart';
import '../models/production_data.dart';
import '../models/production_repository.dart';
import '../models/tank_pairing_codec.dart';
import 'oceaneyes_camera_coordinator.dart';
import 'oceaneyes_fixture_coordinator.dart';
import 'oceaneyes_live_session_coordinator.dart';
import 'oceaneyes_navigation_coordinator.dart';
import 'oceaneyes_persistence_coordinator.dart';
import 'oceaneyes_production_binding_coordinator.dart';
import 'oceaneyes_wake_lock_coordinator.dart';

class OceanEyesController extends ChangeNotifier
    implements OceanEyesCameraHost {
  OceanEyesController({
    SharedPreferences? preferences,
    FishInventoryRepository? inventoryRepository,
    OceanEyesSettingsRepository? settingsRepository,
    Uri? launchUri,
    bool requireLogin = false,
    this.productionEnabled = false,
    String? productionStartupError,
    ProductionOceanEyesRepository? productionRepository,
    ProductionAuthGateway? productionAuth,
    CameraCaptureGateway? cameraGateway,
    FishInferenceEngine? inferenceEngine,
    NotificationServiceGateway? notificationService,
    OceanEyesLiveGateway? liveGateway,
    WakeLockGateway? wakeLockGateway,
    CameraHandoffConfiguration cameraHandoffConfiguration =
        const CameraHandoffConfiguration(),
    CameraHandoffDelay? cameraHandoffDelay,
    String webPushVapidKey = '',
  }) : _persistence = OceanEyesPersistenceCoordinator(
         inventoryRepository:
             inventoryRepository ??
             (preferences == null
                 ? null
                 : SharedPreferencesFishInventoryRepository(preferences)),
         settingsRepository:
             settingsRepository ??
             (preferences == null
                 ? null
                 : SharedPreferencesOceanEyesSettingsRepository(preferences)),
       ),
       _preferences = preferences,
       productionError = productionStartupError,
       _productionRepository = productionRepository,
       _cameraHandoffConfiguration = cameraHandoffConfiguration,
       _cameraHandoffDelay = cameraHandoffDelay ?? _defaultCameraHandoffDelay {
    _navigation = OceanEyesNavigationCoordinator(onChanged: _notify);
    _wakeLock = OceanEyesWakeLockCoordinator(
      gateway: wakeLockGateway,
      onError: _recordProductionError,
    );
    _camera = OceanEyesCameraCoordinator(
      enabled: productionEnabled,
      host: this,
      repository: _productionRepository,
      gateway: cameraGateway,
      inference: inferenceEngine,
      wakeLock: _wakeLock,
      handoffConfiguration: _cameraHandoffConfiguration,
      handoffDelay: _cameraHandoffDelay,
      isLivePublishing: () => _liveSession.isPublishing,
      stopLive: () => _liveSession.stop(),
      persist: _savePreferences,
      onError: _recordProductionError,
      onChanged: _notify,
    );
    _liveSession = OceanEyesLiveSessionCoordinator(
      enabled: productionEnabled,
      repository: _productionRepository,
      camera: cameraGateway,
      gateway: liveGateway,
      wakeLock: _wakeLock,
      handoffConfiguration: _cameraHandoffConfiguration,
      handoffDelay: _cameraHandoffDelay,
      currentTankId: () => activeTankId,
      currentRole: () => _tankRole,
      useFrontCamera: () => usingFrontCamera,
      isDisposed: () => _disposed,
      queueProductionWrite: _queueProductionWrite,
      onError: _recordProductionError,
      onChanged: _notify,
    );
    _productionBindings = OceanEyesProductionBindingCoordinator(
      repository: _productionRepository,
      auth: productionAuth,
      notifications: notificationService,
      webPushVapidKey: webPushVapidKey,
      isDisposed: () => _disposed,
      onError: _recordProductionError,
    );
    final uri = launchUri ?? Uri.base;
    final requestedFixture = uri.queryParameters['fixture'];
    final forceLogin =
        requestedFixture?.toLowerCase().replaceAll('-', '_') == 'login' ||
        uri.queryParameters['route'] == 'login';
    isAuthenticated = productionEnabled
        ? productionAuth?.currentUser != null || productionStartupError != null
        : !(forceLogin || (requireLogin && requestedFixture == null));
    final shouldApplyFixture =
        !productionEnabled && requestedFixture != null && !forceLogin;
    if (shouldApplyFixture) {
      applyFixtureName(requestedFixture, notify: false);
    } else {
      _restorePreferences();
    }
    _navigation.configureLaunch(uri);
    if (productionEnabled && productionStartupError != null) {
      _clearProductionTankData();
      activeTankId = null;
      tankName = 'Aquarium';
      tankConnected = false;
      cameraStage = CameraStage.unavailable;
      dashboardHealth = DashboardHealthState.waiting;
      analyticsState = AnalyticsContentState.error;
    }
  }

  /// Starts production subscriptions after Firebase and anonymous auth have
  /// been composed by the app bootstrap. This is deliberately separate from
  /// the synchronous constructor used by unit tests and deterministic URLs.
  Future<void> initializeProduction() async {
    if (!productionEnabled || _productionInitialized || _disposed) return;
    if (!_productionBindings.isAvailable) {
      productionError ??= 'Production services are not available.';
      _notify();
      return;
    }
    _productionInitialized = true;
    productionUser = _productionBindings.currentUser;
    isAuthenticated = productionUser != null;
    activeTankId = _preferences?.getString(_activeTankPreferenceKey);
    tankConnected = false;
    dashboardHealth = DashboardHealthState.waiting;
    analyticsState = AnalyticsContentState.loading;
    cameraStage = CameraStage.beforePermission;
    _clearProductionTankData();

    await _productionBindings.initialize(
      onAuthChanged: (user) {
        productionUser = user;
        isAuthenticated = user != null;
        _notify();
      },
      clearTankForAuthChange: _clearTankForAuthChange,
      onLinkedTankIds: _handleLinkedTankIds,
      onNotificationRoute: _openNotificationRoute,
    );
    if (_disposed) return;
    _camera.initialize();
    _liveSession.initialize();
    _notify();
  }

  Future<void> _clearTankForAuthChange() async {
    final previousTankId = activeTankId;
    await _unbindTank(liveTankId: previousTankId);
    if (_disposed) return;
    activeTankId = null;
    tankConnected = false;
    cameraStage = CameraStage.unavailable;
    analyticsState = AnalyticsContentState.empty;
    _clearProductionTankData();
    await _preferences?.remove(_activeTankPreferenceKey);
    _notify();
  }

  void _handleLinkedTankIds(List<String> tankIds) {
    if (_disposed) return;
    final sorted = tankIds.toSet().toList()..sort();
    if (sorted.isEmpty) {
      unawaited(_unbindTank(liveTankId: activeTankId));
      activeTankId = null;
      tankConnected = false;
      cameraStage = CameraStage.unavailable;
      analyticsState = AnalyticsContentState.empty;
      _clearProductionTankData();
      _preferences?.remove(_activeTankPreferenceKey);
      _notify();
      return;
    }
    final requested = activeTankId;
    final selected = requested != null && sorted.contains(requested)
        ? requested
        : sorted.first;
    if (selected != activeTankId || !_productionBindings.hasTankSubscriptions) {
      unawaited(_bindTank(selected));
    }
  }

  Future<void> _bindTank(String tankId) async {
    final repository = _productionRepository;
    if (repository == null || _disposed) return;
    final previousTankId = activeTankId;
    await _unbindTank(liveTankId: previousTankId);
    if (_disposed) return;
    activeTankId = tankId;
    tankConnected = true;
    dashboardHealth = DashboardHealthState.waiting;
    analyticsState = AnalyticsContentState.loading;
    _clearProductionTankData();
    await _preferences?.setString(_activeTankPreferenceKey, tankId);

    await _productionBindings.bindTank(
      tankId: tankId,
      onTank: (tank) {
        if (tank == null) {
          tankConnected = false;
          _clearProductionTankData();
          productionError = 'The selected tank is no longer available.';
        } else {
          tankConnected = true;
          tankName = tank.name;
          clarityThreshold = tank.thresholds.turbidityFnuMax;
          visibleFishThreshold = tank.thresholds.visibleFishChangePercent;
          _waterLineY = tank.waterLineY;
          recalibrationRequested = tank.recalibrationRequested;
          final userId = repository.currentUserId;
          _tankRole = userId == null
              ? ProductionTankMemberRole.none
              : tank.roleFor(userId);
          _liveSession.reevaluateRequests();
        }
        _notify();
      },
      onReadingBundle: (bundle) {
        final latest = bundle.latestRealReading;
        if (latest == null) {
          dashboardHealth = DashboardHealthState.waiting;
        } else {
          _applyLatestReading(latest);
        }
        history = bundle.history;
        final analytics = bundle.analytics;
        _productionClaritySeries = analytics.claritySeries;
        _productionFishCountSeries = analytics.fishCountSeries;
        _productionSpeciesSeries = analytics.speciesSeries;
        heatmapCenters = analytics.heatmapCenters;
        final dimensions = analytics.heatmapSourceDimensions;
        if (dimensions != null) heatmapSourceDimensions = dimensions;
        analyticsState = analytics.points.isEmpty
            ? AnalyticsContentState.empty
            : AnalyticsContentState.populated;
        _notify();
      },
      onReadingError: (error, stackTrace) {
        analyticsState = AnalyticsContentState.error;
        _recordProductionError(error, stackTrace);
      },
      onFishInventory: (inventory) {
        fish = inventory
            .map(
              (entry) => entry.copyWith(
                visible: _fishVisibilityById[entry.id] ?? entry.visible,
              ),
            )
            .toList(growable: false);
        for (final entry in fish) {
          _fishVisibilityById[entry.id] = entry.visible;
        }
        _notify();
      },
      onAlerts: (productionAlerts) {
        alerts = productionAlerts
            .map((productionAlert) => productionAlert.item)
            .toList(growable: false);
        _notify();
      },
      onLiveState: (state) {
        liveState = state;
        _notify();
      },
      onLiveRequests: _liveSession.updateRequests,
    );
    _camera.configureAutomaticInference();
    _notify();
  }

  Future<void> _unbindTank({
    bool disconnectLive = true,
    String? liveTankId,
  }) async {
    _camera.stopAutomaticInference();
    await _productionBindings.unbindTank();
    _tankRole = ProductionTankMemberRole.none;
    _liveSession.clearRequests();
    if (disconnectLive) {
      await _liveSession.stop(tankIdOverride: liveTankId);
    }
  }

  void _clearProductionTankData() {
    for (final entry in fish) {
      _fishVisibilityById[entry.id] = entry.visible;
    }
    fish = const [];
    alerts = const [];
    history = const [];
    heatmapCenters = const [];
    _productionWaterMetrics = _unreportedWaterMetrics;
    _productionClaritySeries = const [];
    _productionFishCountSeries = const [];
    _productionSpeciesSeries = const {};
    heatmapSourceDimensions = const DetectionFrameDimensions(
      width: 1,
      height: 1,
    );
    latestCameraFrameBytes = null;
    liveState = null;
    _liveSession.remoteVideoTrack = null;
    lastTurbidityResult = null;
    _waterLineY = null;
    recalibrationRequested = false;
  }

  void _applyLatestReading(ProductionReading reading) {
    final threshold = clarityThreshold;
    final turbidity = reading.turbidityFnu;
    final temperature = reading.temperatureCelsius;
    final ph = reading.ph;
    final ammonia = reading.ammoniaPpm;
    final nitrite = reading.nitritePpm;
    final turbidityWarning = turbidity != null && turbidity > threshold;
    final temperatureWarning =
        temperature != null && (temperature < 23 || temperature > 28);
    final phWarning = ph != null && (ph < 6.5 || ph > 8.2);
    final ammoniaWarning = ammonia != null && ammonia > 0.1;
    final nitriteWarning = nitrite != null && nitrite > 0.2;
    _productionWaterMetrics = [
      _productionMetric(
        'Temperature',
        temperature,
        '°C',
        warning: temperatureWarning,
        safeStatus: 'Ideal',
        warningStatus: 'Watch',
      ),
      _productionMetric(
        'pH Level',
        ph,
        'pH',
        warning: phWarning,
        safeStatus: 'Balanced',
        warningStatus: 'Watch',
      ),
      _productionMetric(
        'Turbidity',
        turbidity,
        'FNU',
        warning: turbidityWarning,
        safeStatus: 'Clear',
        warningStatus: 'Cloudy',
      ),
      _productionMetric(
        'Ammonia',
        ammonia,
        'ppm',
        warning: ammoniaWarning,
        safeStatus: 'Safe',
        warningStatus: 'Watch',
      ),
      _productionMetric(
        'Nitrite',
        nitrite,
        'ppm',
        warning: nitriteWarning,
        safeStatus: 'Safe',
        warningStatus: 'Watch',
      ),
    ];
    dashboardHealth =
        turbidityWarning ||
            temperatureWarning ||
            phWarning ||
            ammoniaWarning ||
            nitriteWarning
        ? DashboardHealthState.warning
        : DashboardHealthState.healthy;
    if (turbidity != null) {
      lastTurbidityResult = '${turbidity.toStringAsFixed(1)} FNU';
    }
    if (reading.detections.isNotEmpty) {
      heatmapCenters = reading.detections;
    }
    final dimensions = reading.frameDimensions;
    if (dimensions != null) heatmapSourceDimensions = dimensions;
  }

  WaterMetric _productionMetric(
    String label,
    double? value,
    String unit, {
    required bool warning,
    required String safeStatus,
    required String warningStatus,
  }) => WaterMetric(
    label: label,
    value: value == null ? '--' : value.toStringAsFixed(2),
    unit: unit,
    status: value == null
        ? 'Not reported'
        : warning
        ? warningStatus
        : safeStatus,
    isWarning: warning,
  );

  void _openNotificationRoute(NotificationRoute route) {
    if (route.tankId != activeTankId) {
      unawaited(_bindTank(route.tankId));
    }
    _navigation.openNotificationAlert(route.alertId);
  }

  void _recordProductionError(Object error, [StackTrace? stackTrace]) {
    if (_disposed) return;
    productionError = error.toString();
    _notify();
  }

  Future<void> startViewerLiveStream() => _liveSession.startViewer();

  Future<void> startMonitorLiveStream() => _liveSession.startMonitor();

  Future<void> stopLiveStream() => _liveSession.stop();

  void _queueProductionWrite(Future<void> Function() operation) {
    if (!productionEnabled || _productionRepository == null) return;
    _productionWriteQueue = _productionWriteQueue.then((_) async {
      try {
        await operation();
      } catch (error, stackTrace) {
        _recordProductionError(error, stackTrace);
      }
    });
  }

  void _persistProductionThresholds() {
    final tankId = activeTankId;
    if (tankId == null || !canEditTankSettings) return;
    _queueProductionWrite(
      () => _productionRepository!.updateThresholds(
        tankId,
        ProductionTankThresholds(
          turbidityFnuMax: clarityThreshold,
          clarityScoreMin: ProductionTankThresholds.clarityScoreFromFnu(
            clarityThreshold,
          ),
          visibleFishChangePercent: visibleFishThreshold,
        ),
      ),
    );
  }

  Future<void> _disconnectProductionTank(String tankId) async {
    await _unbindTank(liveTankId: tankId);
    final repository = _productionRepository;
    if (repository == null) return;
    try {
      await repository.unlinkTank(tankId);
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    }
  }

  final OceanEyesPersistenceCoordinator _persistence;
  final SharedPreferences? _preferences;
  final ProductionOceanEyesRepository? _productionRepository;
  late final OceanEyesCameraCoordinator _camera;
  late final OceanEyesWakeLockCoordinator _wakeLock;
  late final OceanEyesLiveSessionCoordinator _liveSession;
  late final OceanEyesProductionBindingCoordinator _productionBindings;
  final CameraHandoffConfiguration _cameraHandoffConfiguration;
  final CameraHandoffDelay _cameraHandoffDelay;
  Future<void> _productionWriteQueue = Future<void>.value();
  bool _disposed = false;
  bool _productionInitialized = false;
  double? _waterLineY;
  @override
  double? get cameraWaterLineY => _waterLineY;

  @override
  bool get isDisposed => _disposed;
  ProductionTankMemberRole _tankRole = ProductionTankMemberRole.none;
  List<WaterMetric> _productionWaterMetrics = _unreportedWaterMetrics;

  static const List<WaterMetric> _unreportedWaterMetrics = [
    WaterMetric(
      label: 'Temperature',
      value: '--',
      unit: '°C',
      status: 'Not reported',
    ),
    WaterMetric(
      label: 'pH Level',
      value: '--',
      unit: 'pH',
      status: 'Not reported',
    ),
    WaterMetric(
      label: 'Turbidity',
      value: '--',
      unit: 'FNU',
      status: 'Not reported',
    ),
    WaterMetric(
      label: 'Ammonia',
      value: '--',
      unit: 'ppm',
      status: 'Not reported',
    ),
    WaterMetric(
      label: 'Nitrite',
      value: '--',
      unit: 'ppm',
      status: 'Not reported',
    ),
  ];
  List<ChartPoint> _productionClaritySeries = const [];
  List<ChartPoint> _productionFishCountSeries = const [];
  Map<String, List<ChartPoint>> _productionSpeciesSeries = const {};
  final Map<String, bool> _fishVisibilityById = {};

  static const String _activeTankPreferenceKey =
      'oceaneyes.production.active_tank.v1';
  static const OceanEyesFixtureCoordinator _fixtures =
      OceanEyesFixtureCoordinator();
  late final OceanEyesNavigationCoordinator _navigation;

  PrimaryTab get activeTab => _navigation.activeTab;
  set activeTab(PrimaryTab value) => _navigation.activeTab = value;
  SecondaryRoute? get secondaryRoute => _navigation.secondaryRoute;
  set secondaryRoute(SecondaryRoute? value) =>
      _navigation.secondaryRoute = value;
  String? get selectedAlertId => _navigation.selectedAlertId;
  set selectedAlertId(String? value) => _navigation.selectedAlertId = value;
  PrimaryTab get secondaryOrigin => _navigation.secondaryOrigin;
  set secondaryOrigin(PrimaryTab value) => _navigation.secondaryOrigin = value;
  int get scrollEpoch => _navigation.scrollEpoch;
  set scrollEpoch(int value) => _navigation.scrollEpoch = value;

  bool isAuthenticated = true;
  bool isAuthenticating = false;

  /// True only when the application composition explicitly enables the
  /// production runtime. Direct test controllers default to false and can
  /// continue to use deterministic fixture URLs without platform plugins.
  final bool productionEnabled;
  @override
  String? productionError;
  bool pairingInProgress = false;
  bool recalibrationRequested = false;
  @override
  String? activeTankId;
  ProductionAuthUser? productionUser;
  ProductionLiveState? liveState;
  Object? get remoteVideoTrack => _liveSession.remoteVideoTrack;
  OceanEyesLiveConnectionState get liveConnectionState =>
      _liveSession.connectionState;
  @override
  Uint8List? latestCameraFrameBytes;

  FixtureScenario fixtureScenario = FixtureScenario.dashboardWaiting;
  DashboardHealthState dashboardHealth = DashboardHealthState.waiting;
  AnalyticsContentState analyticsState = AnalyticsContentState.empty;
  @override
  CameraStage cameraStage = CameraStage.beforePermission;
  bool cameraPermissionWillGrant = true;

  @override
  List<FishEntry> fish = const [];
  List<AlertItem> alerts = const [];
  List<HistoryReading> history = const [];
  @override
  List<NormalizedDetectionCenter> heatmapCenters = const [];
  @override
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

  @override
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
  @override
  bool autoConnect = false;
  @override
  double pollingIntervalMs = 10000;
  @override
  double detectionConfidenceThreshold = 0.35;
  @override
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
  @override
  String? lastTurbidityResult = '1.5 FNU';
  String tankName = 'Living Room Reef';
  @override
  bool tankConnected = true;
  @override
  bool usingFrontCamera = false;

  Future<void> signInWithGoogle() async {
    if (productionEnabled) {
      await linkGoogleAccount();
      return;
    }
    if (isAuthenticated || isAuthenticating) return;
    isAuthenticating = true;
    _notify();
    await Future<void>.delayed(const Duration(milliseconds: 650));
    if (_disposed) return;
    isAuthenticating = false;
    isAuthenticated = true;
    _notify();
  }

  Future<void> linkGoogleAccount() async {
    if (!productionEnabled ||
        !_productionBindings.isAvailable ||
        isAuthenticating) {
      return;
    }
    isAuthenticating = true;
    productionError = null;
    _notify();
    final token = _productionBindings.currentNotificationToken;
    try {
      final result = await _productionBindings.linkGoogleAccount(
        fcmToken: token,
      );
      productionUser = result.user ?? _productionBindings.currentUser;
      isAuthenticated = productionUser != null;
      if (result.status == GoogleAccountLinkStatus.signedIntoExistingAccount) {
        productionError = result.failedTankIds.isEmpty
            ? 'Signed into the existing Google account. Previous anonymous '
                  'tank ownership is not transferred; accessible tanks were '
                  'rejoined as a viewer.'
            : 'Signed into the existing Google account, but could not restore '
                  '${result.failedTankIds.length} tank connection(s).';
      } else if (result.failedTankIds.isNotEmpty) {
        productionError =
            'Linked the account, but could not restore '
            '${result.failedTankIds.length} tank connection(s).';
      }
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    } finally {
      if (token != null && token.isNotEmpty) {
        try {
          await _productionRepository?.saveFcmToken(token);
        } catch (error, stackTrace) {
          _recordProductionError(error, stackTrace);
        }
      }
      isAuthenticating = false;
      _notify();
    }
  }

  Future<bool> pairTankPayload(String value) async {
    final repository = _productionRepository;
    if (!productionEnabled || repository == null || pairingInProgress) {
      return false;
    }
    pairingInProgress = true;
    productionError = null;
    _notify();
    try {
      final trimmed = value.trim();
      final tankId = trimmed.startsWith('{')
          ? TankPairingCodec.decode(trimmed).tankId
          : TankPairingCodec.normalizeTankId(trimmed);
      final joined = await repository.joinTank(tankId);
      if (!joined) {
        throw StateError('No tank was found for that pairing code.');
      }
      await _bindTank(tankId);
      return true;
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
      return false;
    } finally {
      pairingInProgress = false;
      _notify();
    }
  }

  Future<String?> createProductionTank(String name) async {
    final repository = _productionRepository;
    if (!productionEnabled || repository == null || pairingInProgress) {
      return null;
    }
    pairingInProgress = true;
    productionError = null;
    _notify();
    try {
      final tankId = await repository.createTank(name.trim());
      await _bindTank(tankId);
      return tankId;
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
      return null;
    } finally {
      pairingInProgress = false;
      _notify();
    }
  }

  void requestTankRecalibration() {
    final tankId = activeTankId;
    if (!productionEnabled || tankId == null || !canCalibrateTank) return;
    recalibrationRequested = true;
    _notify();
    _queueProductionWrite(
      () => _productionRepository!.requestRecalibration(tankId, true),
    );
  }

  void setWaterLineCalibration(double normalizedY) {
    final tankId = activeTankId;
    if (!productionEnabled || tankId == null || !canCalibrateTank) return;
    final waterLineY = normalizedY.clamp(0, 1).toDouble();
    _waterLineY = waterLineY;
    recalibrationRequested = false;
    _notify();
    _queueProductionWrite(() async {
      await _productionRepository!.updateCalibration(tankId, waterLineY);
      await _productionRepository.requestRecalibration(tankId, false);
    });
  }

  void previewWaterLineCalibration(double normalizedY) {
    final tankId = activeTankId;
    if (!productionEnabled || tankId == null || !canCalibrateTank) return;
    _waterLineY = normalizedY.clamp(0, 1).toDouble();
    _notify();
  }

  int get totalFish => fish.fold(0, (sum, entry) => sum + entry.count);
  int get detectedFish => fish.fold(0, (sum, entry) => sum + entry.detected);
  List<WaterMetric> get waterMetrics => productionEnabled
      ? _productionWaterMetrics
      : dashboardHealth == DashboardHealthState.warning
      ? DemoFixtures.warningWaterMetrics
      : DemoFixtures.waterMetrics;
  List<SpeciesOption> get availableSpecies => DemoFixtures.species;
  List<ChartPoint> get claritySeries =>
      productionEnabled ? _productionClaritySeries : DemoFixtures.claritySeries;
  List<ChartPoint> get fishCountPoints {
    if (productionEnabled) {
      if (selectedSpecies == 'All species') {
        return _productionFishCountSeries;
      }
      for (final entry in fish) {
        if (entry.name == selectedSpecies) {
          return _productionSpeciesSeries[entry.speciesId] ?? const [];
        }
      }
      return const [];
    }
    return AnalyticsSeriesService.fishCount(fish, selectedSpecies);
  }

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

  bool get hasLinkedGoogleAccount =>
      productionEnabled && _productionBindings.hasLinkedAccount;
  String get tankReferenceCode => activeTankId ?? 'tank-demo';
  bool get canEditTankSettings =>
      !productionEnabled || _tankRole == ProductionTankMemberRole.owner;
  bool get canCalibrateTank =>
      !productionEnabled ||
      _tankRole == ProductionTankMemberRole.owner ||
      _tankRole == ProductionTankMemberRole.monitor;
  double get waterLineCalibration =>
      (_waterLineY ?? 0.42).clamp(0, 1).toDouble();
  bool get isLiveConnected => _liveSession.isConnected;

  void selectTab(PrimaryTab tab) {
    _navigation.selectTab(tab);
  }

  void openAlerts() {
    _navigation.openAlerts();
  }

  void requestAddFish() => _navigation.requestAddFish();

  /// Consumes a one-shot request to present the add-fish sheet.
  ///
  /// No notification is emitted: the request is consumed while the receiving
  /// screen handles the controller notification that created it.
  bool consumeAddFishRequest() {
    return _navigation.consumeAddFishRequest();
  }

  void requestAnalyticsSpecies() => _navigation.requestAnalyticsSpecies();

  bool consumeAnalyticsSpeciesRequest() {
    return _navigation.consumeAnalyticsSpeciesRequest();
  }

  void requestAnalyticsRange() => _navigation.requestAnalyticsRange();

  bool consumeAnalyticsRangeRequest() {
    return _navigation.consumeAnalyticsRangeRequest();
  }

  void openHistory() => _navigation.openHistory();

  void openAlertDetail(String id) => _navigation.openAlertDetail(id);

  void popAlertDetail() => _navigation.popAlertDetail();

  void closeSecondaryRoute() => _navigation.closeSecondaryRoute();

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
    if (productionEnabled) {
      final updated = fish.where((entry) => entry.id == id).firstOrNull;
      if (updated != null) {
        _queueProductionWrite(
          () => _productionRepository!.updateFishCount(id, updated.count),
        );
      }
    }
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
    for (final entry in fish) {
      if (entry.id == id) _fishVisibilityById[id] = entry.visible;
    }
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
    final tankId = activeTankId;
    if (productionEnabled && tankId != null) {
      _queueProductionWrite(
        () => _productionRepository!.addFish(
          ProductionFishDraft(
            tankId: tankId,
            speciesId: species.id,
            name: species.name,
          ),
        ),
      );
    }
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
    if (productionEnabled) {
      _queueProductionWrite(() => _productionRepository!.removeFish(id));
    }
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
    if (productionEnabled) {
      // Firestore snapshot streams retry transient failures themselves. Keep
      // the production surface in its loading state until a real snapshot
      // arrives; deterministic fixture values must never cross this boundary.
      return;
    }
    unawaited(
      _completeAfter(const Duration(milliseconds: 650), () {
        analyticsState = AnalyticsContentState.populated;
        heatmapCenters = DemoFixtures.heatmapCenters;
      }),
    );
  }

  Future<void> requestCameraPermission() async {
    if (productionEnabled) {
      await _camera.requestPermission();
      return;
    }
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
    if (productionEnabled) {
      unawaited(requestCameraPermission());
      return;
    }
    cameraPermissionWillGrant = true;
    unawaited(requestCameraPermission());
  }

  void setCameraStage(CameraStage stage) {
    cameraStage = stage;
    _notify();
  }

  void switchCamera() {
    if (productionEnabled) {
      unawaited(_camera.switchLens());
      return;
    }
    usingFrontCamera = !usingFrontCamera;
    _savePreferences();
    _notify();
  }

  void toggleAI(bool enabled) {
    aiEnabled = enabled;
    if (productionEnabled) {
      _savePreferences();
      _camera.configureAutomaticInference();
      _notify();
      if (enabled && cameraStage == CameraStage.active) {
        unawaited(_camera.captureAndAnalyze(measurementOnly: false));
      }
      return;
    }
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
    if (productionEnabled) {
      unawaited(_camera.captureAndAnalyze(measurementOnly: true));
      return;
    }
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
    if (productionEnabled && _tankRole == ProductionTankMemberRole.viewer) {
      if (value) {
        unawaited(_liveSession.startViewer());
      } else {
        unawaited(_liveSession.stop());
      }
    }
  }

  void toggleInventoryDrawer() {
    inventoryDrawerOpen = !inventoryDrawerOpen;
    _notify();
  }

  void renameTank(String value) {
    final trimmed = value.trim();
    if (productionEnabled && !canEditTankSettings) return;
    if (trimmed.isEmpty || trimmed == tankName) return;
    tankName = trimmed;
    final tankId = activeTankId;
    if (productionEnabled && tankId != null) {
      _queueProductionWrite(
        () => _productionRepository!.updateTankName(tankId, trimmed),
      );
    }
    _savePreferences();
    _notify();
  }

  void disconnectTank() {
    final tankId = activeTankId;
    tankConnected = false;
    cameraStage = CameraStage.unavailable;
    fullscreenCamera = false;
    inventoryDrawerOpen = false;
    if (productionEnabled && tankId != null) {
      activeTankId = null;
      _preferences?.remove(_activeTankPreferenceKey);
      unawaited(_disconnectProductionTank(tankId));
    }
    _savePreferences();
    _notify();
  }

  void connectDemoTank() {
    if (productionEnabled) return;
    tankConnected = true;
    cameraStage = CameraStage.active;
    _savePreferences();
    _notify();
  }

  void resolveAlert(String id) {
    alerts = alerts
        .map((alert) => alert.id == id ? alert.copyWith(resolved: true) : alert)
        .toList(growable: false);
    if (productionEnabled) {
      _queueProductionWrite(() => _productionRepository!.resolveAlert(id));
    }
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
    if (productionEnabled &&
        (name == 'clarityThreshold' || name == 'visibleFishThreshold')) {
      _persistProductionThresholds();
    }
    if (productionEnabled && name == 'pollingIntervalMs') {
      _camera.configureAutomaticInference();
    }
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
    if (productionEnabled) _camera.configureAutomaticInference();
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
    final snapshot = _fixtures.build(scenario);
    fixtureScenario = snapshot.scenario;
    selectedSpecies = 'All species';
    analyticsRange = snapshot.analyticsRange;
    analyticsStartTime = const TimeOfDay(hour: 0, minute: 0);
    analyticsEndTime = const TimeOfDay(hour: 23, minute: 59);
    dashboardHealth = snapshot.dashboardHealth;
    analyticsState = snapshot.analyticsState;
    cameraStage = snapshot.cameraStage;
    cameraPermissionWillGrant = snapshot.cameraPermissionWillGrant;
    aiEnabled = snapshot.aiEnabled;
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
    lastTurbidityResult = snapshot.lastTurbidityResult;
    tankName = 'Living Room Reef';
    tankConnected = true;
    usingFrontCamera = false;
    fish = snapshot.fish;
    alerts = snapshot.alerts;
    history = snapshot.history;
    heatmapCenters = snapshot.heatmapCenters;
    heatmapSourceDimensions = DemoFixtures.heatmapSourceDimensions;
    expandedFishId = null;
    _navigation.resetTransientIntents();
    if (notify) _notify();
  }

  void applyFixtureName(String fixture, {bool notify = true}) {
    applyFixture(_fixtures.resolveName(fixture), notify: notify);
  }

  Future<void> _completeAfter(Duration duration, VoidCallback mutate) async {
    await Future<void>.delayed(duration);
    if (_disposed) return;
    mutate();
    _savePreferences();
    _notify();
  }

  void _restorePreferences() {
    final snapshot = _persistence.load();
    fish = snapshot.fish ?? fish;
    for (final entry in fish) {
      _fishVisibilityById[entry.id] = entry.visible;
    }
    final settings = snapshot.settings;
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
    _persistence.save(
      fish: fish,
      settings: OceanEyesSettings(
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
      ),
    );
  }

  /// Waits for queued model-layer writes, primarily for lifecycle hooks/tests.
  Future<void> flushPersistence() async {
    await Future.wait([_persistence.flush(), _productionWriteQueue]);
  }

  void handleAppLifecycleState(AppLifecycleState state) {
    _camera.handleLifecycleState(state);
  }

  Future<void> suspendCameraForPairing() => _camera.suspendForPairing();

  Future<void> resumeCameraAfterPairing() => _camera.resumeAfterPairing();
  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    final liveTankId = activeTankId;
    _disposed = true;
    final bindingsCleanup = _productionBindings.dispose();
    final liveCleanup = _liveSession.dispose(tankId: liveTankId);
    unawaited(
      Future.wait([bindingsCleanup, liveCleanup]).whenComplete(() async {
        await _camera.dispose();
        await _wakeLock.dispose();
      }),
    );
    super.dispose();
  }
}

Future<void> _defaultCameraHandoffDelay(Duration duration) =>
    Future<void>.delayed(duration);
