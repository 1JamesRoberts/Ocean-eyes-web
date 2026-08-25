import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show debugPrint, kReleaseMode;
import 'package:shared_preferences/shared_preferences.dart';

import '../integrations/camera/camera_capture_gateway.dart';
import '../integrations/firebase/firebase_notification_service.dart';
import '../integrations/livekit/livekit_gateway.dart';
import '../integrations/ml/onnx_fish_inference.dart';
import '../integrations/power/wake_lock_gateway.dart';
import '../models/aquarium_models.dart';
import '../models/classifiable_species.dart';
import '../models/customer_error_message.dart';
import '../models/fish_insights_service.dart';
import '../models/fish_inventory_repository.dart';
import '../models/oceaneyes_settings_repository.dart';
import '../models/onboarding_models.dart';
import '../models/onboarding_repository.dart';
import '../models/production_auth.dart';
import '../models/production_data.dart';
import '../models/production_repository.dart';
import '../models/tank_pairing_codec.dart';
import 'oceaneyes_camera_coordinator.dart';
import 'oceaneyes_live_session_coordinator.dart';
import 'oceaneyes_navigation_coordinator.dart';
import 'oceaneyes_onboarding_coordinator.dart';
import 'oceaneyes_persistence_coordinator.dart';
import 'oceaneyes_production_binding_coordinator.dart';
import 'oceaneyes_wake_lock_coordinator.dart';

class OceanEyesController extends ChangeNotifier
    implements OceanEyesCameraHost {
  OceanEyesController({
    SharedPreferences? preferences,
    FishInventoryRepository? inventoryRepository,
    OceanEyesSettingsRepository? settingsRepository,
    OnboardingRepository? onboardingRepository,
    Uri? launchUri,
    this.localPreviewEnabled = false,
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
       _onboarding = OceanEyesOnboardingCoordinator(
         repository:
             onboardingRepository ??
             (preferences == null
                 ? InMemoryOnboardingRepository()
                 : SharedPreferencesOnboardingRepository(preferences)),
       ),
       _preferences = preferences,
       _productionRepository = productionRepository,
       _cameraHandoffConfiguration = cameraHandoffConfiguration,
       _cameraHandoffDelay = cameraHandoffDelay ?? _defaultCameraHandoffDelay {
    _navigation = OceanEyesNavigationCoordinator(onChanged: _notify);
    _wakeLock = OceanEyesWakeLockCoordinator(
      gateway: wakeLockGateway,
      onError: _recordProductionError,
    );
    _camera = OceanEyesCameraCoordinator(
      enabled: !localPreviewEnabled,
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
      enabled: !localPreviewEnabled,
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
    isAuthenticated =
        localPreviewEnabled || productionAuth?.currentUser != null;
    _restorePreferences();
    _onboarding.loadForAccount(_onboardingAccountNamespace);
    if (localPreviewEnabled) {
      _onboarding.resolveTankLookup(
        tankConnected ? const ['tank-preview'] : const [],
        autoPresent: false,
      );
    }
    _navigation.configureLaunch(uri);
  }

  /// Starts service subscriptions after the app bootstrap has composed the
  /// controller's gateways.
  Future<void> initializeProduction() async {
    if (localPreviewEnabled || _productionInitialized || _disposed) return;
    if (!_productionBindings.isAvailable) {
      productionError ??= 'Production services are not available.';
      _notify();
      return;
    }
    _productionInitialized = true;
    productionUser = _productionBindings.currentUser;
    isAuthenticated = productionUser != null;
    _onboarding.loadForAccount(_onboardingAccountNamespace);
    if (productionUser != null) _onboarding.beginTankLookup();
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
        _onboarding.handleAccountIdentityChange(_onboardingAccountNamespace);
        if (user != null) _onboarding.beginTankLookup();
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
    _onboarding.beginTankLookup();
    await _preferences?.remove(_activeTankPreferenceKey);
    _notify();
  }

  void _handleLinkedTankIds(List<String> tankIds) {
    if (_disposed) return;
    final sorted = tankIds.toSet().toList()..sort();
    _onboarding.resolveTankLookup(sorted);
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
        if (!_analyticsRangeEdited && analytics.points.isNotEmpty) {
          final first = analytics.points.first.timestamp;
          var last = analytics.points.last.timestamp;
          if (!last.isAfter(first)) {
            last = first.add(const Duration(minutes: 1));
          }
          analyticsRange = DateTimeRange(start: first, end: last);
          analyticsStartTime = TimeOfDay(
            hour: first.hour,
            minute: first.minute,
          );
          analyticsEndTime = TimeOfDay(hour: last.hour, minute: last.minute);
        }
        _productionAnalytics = analytics;
        final visibleAnalytics = _refreshProductionAnalyticsProjection();
        analyticsState = visibleAnalytics.points.isEmpty
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
    _analyticsRangeEdited = false;
    fish = const [];
    alerts = const [];
    history = const [];
    heatmapCenters = const [];
    fishDetections = const [];
    _productionWaterMetrics = _unreportedWaterMetrics;
    _productionAnalytics = ProductionAnalyticsData.empty;
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
    fishDetections = reading.fishDetections;
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
    if (!kReleaseMode) {
      debugPrint(
        '[production] $error${stackTrace == null ? '' : '\n$stackTrace'}',
      );
    }
    productionError = oceanEyesCustomerErrorMessage(error);
    _notify();
  }

  Future<void> startViewerLiveStream() => _liveSession.startViewer();

  Future<void> startMonitorLiveStream() => _liveSession.startMonitor();

  Future<void> stopLiveStream() => _liveSession.stop();

  void _queueProductionWrite(Future<void> Function() operation) {
    if (_productionRepository == null) return;
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
  final OceanEyesOnboardingCoordinator _onboarding;
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
  bool _analyticsRangeEdited = false;
  double? _waterLineY;

  String get _onboardingAccountNamespace =>
      productionUser?.uid ??
      OceanEyesOnboardingCoordinator.previewAccountNamespace;
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
  ProductionAnalyticsData _productionAnalytics = ProductionAnalyticsData.empty;
  final Map<String, bool> _fishVisibilityById = {};

  static const String _activeTankPreferenceKey =
      'oceaneyes.production.active_tank.v1';
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
  bool notificationPermissionGranted = false;
  bool notificationPermissionRequesting = false;

  /// Enables a credential-free shell for UI development. Test fixtures add
  /// deterministic data outside `lib/`; release builds never enable this.
  final bool localPreviewEnabled;

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
  @override
  List<FishDetection> fishDetections = const [];

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
      const DetectionFrameDimensions(width: 1, height: 1);

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
  String? lastTurbidityResult;
  String tankName = 'My Aquarium';
  @override
  bool tankConnected = false;
  @override
  bool usingFrontCamera = false;

  Future<void> signInWithGoogle() async {
    if (localPreviewEnabled) {
      if (isAuthenticated || isAuthenticating) return;
      isAuthenticating = true;
      _notify();
      await Future<void>.delayed(const Duration(milliseconds: 650));
      if (_disposed) return;
      isAuthenticating = false;
      isAuthenticated = true;
      _notify();
      return;
    }
    await _signInProductionWithGoogle();
  }

  Future<void> _signInProductionWithGoogle() async {
    if (isAuthenticated || isAuthenticating) {
      return;
    }
    if (!_productionBindings.isAvailable) {
      productionError ??=
          'Google sign-in is unavailable because production services did not '
          'start. Check the Firebase configuration and selected platform.';
      _notify();
      return;
    }
    isAuthenticating = true;
    productionError = null;
    _notify();
    final token = _productionBindings.currentNotificationToken;
    try {
      final result = await _productionBindings.signInWithGoogle();
      productionUser = result.user ?? _productionBindings.currentUser;
      isAuthenticated = productionUser != null;
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    } finally {
      if (isAuthenticated && token != null && token.isNotEmpty) {
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

  Future<void> signOut() async {
    if (localPreviewEnabled) return;
    if (!isAuthenticated || isAuthenticating) return;
    if (!_productionBindings.isAvailable) {
      productionError =
          'Sign-out is unavailable because authentication did not start.';
      _notify();
      return;
    }
    isAuthenticating = true;
    productionError = null;
    _notify();
    try {
      await _productionBindings.signOut(
        fcmToken: _productionBindings.currentNotificationToken,
      );
      productionUser = null;
      isAuthenticated = false;
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    } finally {
      isAuthenticating = false;
      _notify();
    }
  }

  Future<void> requestNotificationPermission() async {
    if (!isAuthenticated ||
        notificationPermissionRequesting ||
        !_productionBindings.isAvailable) {
      return;
    }
    notificationPermissionRequesting = true;
    productionError = null;
    _notify();
    try {
      notificationPermissionGranted = await _productionBindings
          .requestNotificationPermission();
      if (!notificationPermissionGranted) {
        productionError =
            'Notifications are disabled. Enable them in Android Settings '
            'to receive aquarium alerts.';
      }
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    } finally {
      notificationPermissionRequesting = false;
      _notify();
    }
  }

  Future<bool> pairTankPayload(String value) async {
    final repository = _productionRepository;
    if ((!localPreviewEnabled && repository == null) || pairingInProgress) {
      return false;
    }
    final keepOnboardingOpen = shouldShowOnboarding;
    pairingInProgress = true;
    productionError = null;
    _notify();
    try {
      final trimmed = value.trim();
      final tankId = trimmed.startsWith('{')
          ? TankPairingCodec.decode(trimmed).tankId
          : TankPairingCodec.normalizeTankId(trimmed);
      if (localPreviewEnabled) {
        _connectLocalPreviewTank(tankId: tankId);
        _onboarding.markJoined(keepRouteOpen: keepOnboardingOpen);
        return true;
      }
      if (repository == null) return false;
      final joined = await repository.joinTank(tankId);
      if (!joined) {
        throw StateError('No tank was found for that pairing code.');
      }
      await _bindTank(tankId);
      _onboarding.markJoined(keepRouteOpen: keepOnboardingOpen);
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
    if ((!localPreviewEnabled && repository == null) || pairingInProgress) {
      return null;
    }
    final keepOnboardingOpen = shouldShowOnboarding;
    pairingInProgress = true;
    productionError = null;
    _notify();
    try {
      final trimmedName = name.trim();
      if (trimmedName.isEmpty) {
        throw ArgumentError('Tank name cannot be empty.');
      }
      if (localPreviewEnabled) {
        const tankId = 'tank-preview';
        _connectLocalPreviewTank(name: trimmedName, tankId: tankId);
        _onboarding.markCreated(keepRouteOpen: keepOnboardingOpen);
        return tankId;
      }
      if (repository == null) return null;
      final tankId = await repository.createTank(trimmedName);
      await _bindTank(tankId);
      _onboarding.markCreated(keepRouteOpen: keepOnboardingOpen);
      return tankId;
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
      return null;
    } finally {
      pairingInProgress = false;
      _notify();
    }
  }

  OnboardingState get onboardingState => _onboarding.state;
  bool get shouldShowOnboarding => _onboarding.showRoute;
  bool get showTankSetupBanner => !tankConnected && _onboarding.showSetupBanner;

  void openOnboarding() {
    if (tankConnected) return;
    if (!_onboarding.tankLookupResolved) {
      return;
    }
    _onboarding.open();
    _notify();
  }

  void continueOnboardingFromWelcome() {
    _onboarding.continueFromWelcome();
    _notify();
  }

  void chooseOnboardingPath(OnboardingPath path) {
    _onboarding.choosePath(path);
    _notify();
  }

  void postponeOnboarding() {
    if (pairingInProgress) return;
    _onboarding.postpone();
    _notify();
  }

  void finishOnboarding() {
    _onboarding.finishRoute();
    closeSecondaryRoute();
    selectTab(PrimaryTab.dashboard);
    _notify();
  }

  void handleOnboardingBack() {
    if (pairingInProgress) return;
    if (_onboarding.back()) _notify();
  }

  void requestTankRecalibration() {
    final tankId = activeTankId;
    if (tankId == null || !canCalibrateTank) return;
    recalibrationRequested = true;
    _notify();
    _queueProductionWrite(
      () => _productionRepository!.requestRecalibration(tankId, true),
    );
  }

  void setWaterLineCalibration(double normalizedY) {
    final tankId = activeTankId;
    if (tankId == null || !canCalibrateTank) return;
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
    if (tankId == null || !canCalibrateTank) return;
    _waterLineY = normalizedY.clamp(0, 1).toDouble();
    _notify();
  }

  int get totalFish => fish.fold(0, (sum, entry) => sum + entry.count);
  int get detectedFish => fish.fold(0, (sum, entry) => sum + entry.detected);
  List<WaterMetric> get waterMetrics => _productionWaterMetrics;
  List<SpeciesOption> get availableSpecies =>
      ClassifiableSpeciesCatalog.options;
  List<ChartPoint> get claritySeries => _productionClaritySeries;
  List<ChartPoint> get fishCountPoints {
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

  List<ChartPoint> get spreadPoints => const [];
  List<FishDiagnostic> get fishDiagnostics => const [];
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

  bool get productionServicesAvailable => _productionBindings.isAvailable;
  String get tankReferenceCode => activeTankId ?? '';
  ProductionLiveRole get liveRole => _tankRole.liveRole;
  bool get canEditTankSettings =>
      localPreviewEnabled || _tankRole == ProductionTankMemberRole.owner;
  bool get canCalibrateTank =>
      localPreviewEnabled ||
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
    final updated = fish.where((entry) => entry.id == id).firstOrNull;
    if (updated != null) {
      _queueProductionWrite(
        () => _productionRepository!.updateFishCount(id, updated.count),
      );
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
    if (tankId != null) {
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
    _queueProductionWrite(() => _productionRepository!.removeFish(id));
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
    if (!range.end.isAfter(range.start)) {
      throw ArgumentError.value(
        range,
        'range',
        'Analytics range must have an end after its start.',
      );
    }
    _analyticsRangeEdited = true;
    analyticsRange = range;
    analyticsStartTime =
        start ?? TimeOfDay(hour: range.start.hour, minute: range.start.minute);
    analyticsEndTime =
        end ?? TimeOfDay(hour: range.end.hour, minute: range.end.minute);
    if (_productionAnalytics.points.isNotEmpty) {
      final visibleAnalytics = _refreshProductionAnalyticsProjection();
      analyticsState = visibleAnalytics.points.isEmpty
          ? AnalyticsContentState.empty
          : AnalyticsContentState.populated;
    }
    _notify();
  }

  ProductionAnalyticsData _refreshProductionAnalyticsProjection() {
    final visibleAnalytics = _productionAnalytics.filteredByRange(
      rangeStart: analyticsRange.start,
      rangeEnd: analyticsRange.end,
    );
    _productionClaritySeries = visibleAnalytics.claritySeries;
    _productionFishCountSeries = visibleAnalytics.fishCountSeries;
    _productionSpeciesSeries = visibleAnalytics.speciesSeries;
    heatmapCenters = visibleAnalytics.heatmapCenters;
    final dimensions = visibleAnalytics.heatmapSourceDimensions;
    if (dimensions != null) heatmapSourceDimensions = dimensions;
    return visibleAnalytics;
  }

  void retryAnalytics() {
    analyticsState = AnalyticsContentState.loading;
    heatmapCenters = const [];
    _notify();
    // Firestore snapshot streams retry transient failures themselves. Keep
    // the surface loading until a real snapshot arrives.
  }

  Future<void> requestCameraPermission() async {
    if (localPreviewEnabled) {
      cameraStage = CameraStage.requestingPermission;
      _notify();
      await Future<void>.delayed(const Duration(milliseconds: 500));
      if (_disposed) return;
      cameraStage = cameraPermissionWillGrant
          ? CameraStage.active
          : CameraStage.denied;
      _notify();
      return;
    }
    await _camera.requestPermission();
  }

  /// Connects the camera feed from whatever non-streaming state it is in.
  ///
  /// Camera state is owned by [OceanEyesCameraCoordinator].
  Future<void> connectStream() async {
    switch (cameraStage) {
      case CameraStage.requestingPermission:
      case CameraStage.active:
      case CameraStage.aiProcessing:
      case CameraStage.measuringTurbidity:
        return;
      case CameraStage.idle:
        if (localPreviewEnabled) {
          setCameraStage(CameraStage.active);
          return;
        }
        await _camera.resume();
      case CameraStage.beforePermission:
        await requestCameraPermission();
      case CameraStage.denied:
      case CameraStage.unavailable:
        retryCamera();
    }
  }

  void retryCamera() {
    if (localPreviewEnabled) cameraPermissionWillGrant = true;
    unawaited(requestCameraPermission());
  }

  void setCameraStage(CameraStage stage) {
    cameraStage = stage;
    _notify();
  }

  void switchCamera() {
    if (localPreviewEnabled) {
      usingFrontCamera = !usingFrontCamera;
      _savePreferences();
      _notify();
      return;
    }
    unawaited(_camera.switchLens());
  }

  void toggleAI(bool enabled) {
    aiEnabled = enabled;
    if (localPreviewEnabled) {
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
      return;
    }
    _savePreferences();
    _camera.configureAutomaticInference();
    _notify();
    if (enabled && cameraStage == CameraStage.active) {
      unawaited(_camera.captureAndAnalyze(measurementOnly: false));
    }
  }

  void measureTurbidity() {
    if (localPreviewEnabled) {
      cameraStage = CameraStage.measuringTurbidity;
      lastTurbidityResult = null;
      _notify();
      unawaited(
        _completeAfter(const Duration(milliseconds: 1100), () {
          cameraStage = CameraStage.active;
          lastTurbidityResult = '1.5 FNU';
        }),
      );
      return;
    }
    unawaited(_camera.captureAndAnalyze(measurementOnly: true));
  }

  void setFullscreenCamera(bool value) {
    fullscreenCamera = value;
    if (!value) inventoryDrawerOpen = false;
    _notify();
    if (_tankRole == ProductionTankMemberRole.viewer) {
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
    if (!canEditTankSettings) return;
    if (trimmed.isEmpty || trimmed == tankName) return;
    tankName = trimmed;
    final tankId = activeTankId;
    if (tankId != null) {
      _queueProductionWrite(
        () => _productionRepository!.updateTankName(tankId, trimmed),
      );
    }
    _savePreferences();
    _notify();
  }

  void disconnectTank() {
    final onboardingLookupResolved = _onboarding.tankLookupResolved;
    final tankId = activeTankId;
    tankConnected = false;
    cameraStage = CameraStage.unavailable;
    fullscreenCamera = false;
    inventoryDrawerOpen = false;
    if (tankId != null) {
      activeTankId = null;
      if (!localPreviewEnabled) {
        _clearProductionTankData();
        dashboardHealth = DashboardHealthState.waiting;
        analyticsState = AnalyticsContentState.empty;
        _preferences?.remove(_activeTankPreferenceKey);
        unawaited(_disconnectProductionTank(tankId));
      }
    }
    _onboarding.resetForDisconnectedTank();
    _onboarding.resolveTankLookup(const []);
    if (!localPreviewEnabled && !onboardingLookupResolved) {
      _onboarding.beginTankLookup();
    }
    _savePreferences();
    _notify();
  }

  void _connectLocalPreviewTank({required String tankId, String? name}) {
    if (name != null) tankName = name;
    activeTankId = tankId;
    tankConnected = true;
    cameraStage = CameraStage.active;
    _onboarding.resolveTankLookup([tankId], autoPresent: false);
    _savePreferences();
  }

  void resolveAlert(String id) {
    alerts = alerts
        .map((alert) => alert.id == id ? alert.copyWith(resolved: true) : alert)
        .toList(growable: false);
    _queueProductionWrite(() => _productionRepository!.resolveAlert(id));
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

  Future<void> _completeAfter(Duration duration, VoidCallback mutate) async {
    await Future<void>.delayed(duration);
    if (_disposed) return;
    mutate();
    _savePreferences();
    _notify();
  }

  void previewSetting(String name, double value) {
    _applySetting(name, value);
    _notify();
  }

  void commitSetting(String name, double value) {
    _applySetting(name, value);
    _savePreferences();
    if (name == 'clarityThreshold' || name == 'visibleFishThreshold') {
      _persistProductionThresholds();
    }
    if (name == 'pollingIntervalMs') {
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
    _camera.configureAutomaticInference();
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
    await Future.wait([
      _persistence.flush(),
      _productionWriteQueue,
      _onboarding.flush(),
    ]);
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
