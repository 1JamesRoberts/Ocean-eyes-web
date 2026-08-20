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

class OceanEyesController extends ChangeNotifier {
  OceanEyesController({
    SharedPreferences? preferences,
    FishInventoryRepository? inventoryRepository,
    OceanEyesSettingsRepository? settingsRepository,
    Uri? launchUri,
    bool requireLogin = false,
    bool productionEnabled = false,
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
  }) : _inventoryRepository =
           inventoryRepository ??
           (preferences == null
               ? null
               : SharedPreferencesFishInventoryRepository(preferences)),
       _settingsRepository =
           settingsRepository ??
           (preferences == null
               ? null
               : SharedPreferencesOceanEyesSettingsRepository(preferences)),
       _preferences = preferences,
       productionEnabled =
           productionEnabled &&
           !(launchUri ?? Uri.base).queryParameters.containsKey('fixture'),
       productionError = productionStartupError,
       _productionRepository = productionRepository,
       _productionAuth = productionAuth,
       _cameraGateway = cameraGateway,
       _inferenceEngine = inferenceEngine,
       _notificationService = notificationService,
       _liveGateway = liveGateway,
       _wakeLockGateway = wakeLockGateway,
       _cameraHandoffConfiguration = cameraHandoffConfiguration,
       _cameraHandoffDelay = cameraHandoffDelay ?? _defaultCameraHandoffDelay,
       _webPushVapidKey = webPushVapidKey {
    final uri = launchUri ?? Uri.base;
    final requestedFixture = uri.queryParameters['fixture'];
    final forceLogin =
        requestedFixture?.toLowerCase().replaceAll('-', '_') == 'login' ||
        uri.queryParameters['route'] == 'login';
    isAuthenticated = this.productionEnabled
        ? productionAuth?.currentUser != null || productionStartupError != null
        : !(forceLogin || (requireLogin && requestedFixture == null));
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
    if (this.productionEnabled && productionStartupError != null) {
      _clearProductionTankData();
      activeTankId = null;
      tankName = 'Aquarium';
      tankConnected = false;
      cameraStage = CameraStage.unavailable;
      dashboardHealth = DashboardHealthState.waiting;
      analyticsState = AnalyticsContentState.error;
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

  /// Starts production subscriptions after Firebase and anonymous auth have
  /// been composed by the app bootstrap. This is deliberately separate from
  /// the synchronous constructor used by unit tests and deterministic URLs.
  Future<void> initializeProduction() async {
    if (!productionEnabled || _productionInitialized || _disposed) return;
    final repository = _productionRepository;
    final auth = _productionAuth;
    if (repository == null || auth == null) {
      productionError ??= 'Production services are not available.';
      _notify();
      return;
    }
    _productionInitialized = true;
    productionUser = auth.currentUser;
    isAuthenticated = productionUser != null;
    activeTankId = _preferences?.getString(_activeTankPreferenceKey);
    tankConnected = false;
    dashboardHealth = DashboardHealthState.waiting;
    analyticsState = AnalyticsContentState.loading;
    cameraStage = CameraStage.beforePermission;
    _clearProductionTankData();

    _productionSubscriptions.add(
      auth.authStateChanges().listen((user) {
        final previousUid = productionUser?.uid;
        productionUser = user;
        isAuthenticated = user != null;
        if (previousUid != user?.uid) {
          unawaited(_rebindLinkedTankIds(user?.uid));
        }
        _notify();
      }, onError: _recordProductionError),
    );
    await _rebindLinkedTankIds(productionUser?.uid);
    if (_disposed) return;

    final camera = _cameraGateway;
    if (camera != null) {
      _applyCameraSnapshot(camera.snapshot);
      _productionSubscriptions.add(
        camera.states.listen(
          _applyCameraSnapshot,
          onError: _recordProductionError,
        ),
      );
    }

    final live = _liveGateway;
    if (live != null) {
      _productionSubscriptions.add(
        live.snapshots.listen((snapshot) {
          liveConnectionState = snapshot.state;
          remoteVideoTrack = snapshot.remoteVideoTrack;
          if (snapshot.error != null) {
            productionError = 'Live stream: ${snapshot.error}';
          }
          _notify();
        }, onError: _recordProductionError),
      );
    }

    final notifications = _notificationService;
    if (notifications != null) {
      _productionSubscriptions.add(
        notifications.openedRoutes.listen(
          _openNotificationRoute,
          onError: _recordProductionError,
        ),
      );
      try {
        await notifications.initialize(
          saveToken: repository.saveFcmToken,
          webVapidKey: _webPushVapidKey,
        );
      } catch (error, stackTrace) {
        _recordProductionError(error, stackTrace);
      }
    }
    _notify();
  }

  Future<void> _rebindLinkedTankIds(String? uid) {
    final generation = ++_linkedTankSubscriptionGeneration;
    _linkedTankTargetUid = uid;
    _linkedTankRebindQueue = _linkedTankRebindQueue.then((_) async {
      try {
        if (_disposed || generation != _linkedTankSubscriptionGeneration) {
          return;
        }
        final previous = _linkedTankIdsSubscription;
        final previousUid = _linkedTankSubscriptionUid;
        _linkedTankIdsSubscription = null;
        if (previous != null) await previous.cancel();
        if (_disposed ||
            generation != _linkedTankSubscriptionGeneration ||
            uid != _linkedTankTargetUid) {
          return;
        }
        if (previousUid != null && previousUid != uid) {
          await _clearTankForAuthChange();
          if (_disposed ||
              generation != _linkedTankSubscriptionGeneration ||
              uid != _linkedTankTargetUid) {
            return;
          }
        }
        _linkedTankSubscriptionUid = null;
        if (uid == null || uid.isEmpty) {
          return;
        }

        // Establish the UID gate before listen: synchronous test/replay streams
        // are allowed to emit their first snapshot from inside listen().
        _linkedTankSubscriptionUid = uid;
        final subscription = _productionRepository!.watchLinkedTankIds().listen(
          (tankIds) {
            if (_disposed ||
                generation != _linkedTankSubscriptionGeneration ||
                uid != _linkedTankSubscriptionUid) {
              return;
            }
            _handleLinkedTankIds(tankIds);
          },
          onError: (Object error, StackTrace stackTrace) {
            if (!_disposed &&
                generation == _linkedTankSubscriptionGeneration &&
                uid == _linkedTankSubscriptionUid) {
              _recordProductionError(error, stackTrace);
            }
          },
        );
        if (_disposed || generation != _linkedTankSubscriptionGeneration) {
          await subscription.cancel();
          return;
        }
        _linkedTankIdsSubscription = subscription;
      } catch (error, stackTrace) {
        if (!_disposed && generation == _linkedTankSubscriptionGeneration) {
          _linkedTankSubscriptionUid = null;
          _linkedTankIdsSubscription = null;
          _recordProductionError(error, stackTrace);
        }
      }
    });
    return _linkedTankRebindQueue;
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
    if (selected != activeTankId || _tankSubscriptions.isEmpty) {
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

    _tankSubscriptions.add(
      repository.watchTank(tankId).listen((tank) {
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
          _handleLiveRequests(_liveRequests);
        }
        _notify();
      }, onError: _recordProductionError),
    );
    _tankSubscriptions.add(
      repository
          .watchReadingBundle(tankId)
          .listen(
            (bundle) {
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
            onError: (Object error, StackTrace stackTrace) {
              analyticsState = AnalyticsContentState.error;
              _recordProductionError(error, stackTrace);
            },
          ),
    );
    _tankSubscriptions.add(
      repository.watchFishInventory(tankId).listen((inventory) {
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
      }, onError: _recordProductionError),
    );
    _tankSubscriptions.add(
      repository.watchAlerts(tankId).listen((productionAlerts) {
        alerts = productionAlerts
            .map((productionAlert) => productionAlert.item)
            .toList(growable: false);
        _notify();
      }, onError: _recordProductionError),
    );
    _tankSubscriptions.add(
      repository.watchLiveState(tankId).listen((state) {
        liveState = state;
        _notify();
      }, onError: _recordProductionError),
    );
    _tankSubscriptions.add(
      repository
          .watchLiveRequests(tankId)
          .listen(_handleLiveRequests, onError: _recordProductionError),
    );
    _configureInferenceTimer();
    _notify();
  }

  Future<void> _unbindTank({
    bool disconnectLive = true,
    String? liveTankId,
  }) async {
    _inferenceTimer?.cancel();
    _inferenceTimer = null;
    _syncWakeLock();
    _liveHeartbeat?.cancel();
    _liveHeartbeat = null;
    for (final subscription in _tankSubscriptions) {
      await subscription.cancel();
    }
    _tankSubscriptions.clear();
    _tankRole = ProductionTankMemberRole.none;
    _liveRequests = const [];
    if (disconnectLive) {
      await _enqueueLiveOperation(
        () => _stopLiveSession(clearRequest: true, tankIdOverride: liveTankId),
      );
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
    remoteVideoTrack = null;
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
    secondaryOrigin = activeTab;
    secondaryRoute = SecondaryRoute.alerts;
    selectedAlertId = route.alertId;
    scrollEpoch += 1;
    _notify();
  }

  void _recordProductionError(Object error, [StackTrace? stackTrace]) {
    if (_disposed) return;
    productionError = error.toString();
    _notify();
  }

  void _applyCameraSnapshot(CameraCaptureSnapshot snapshot) {
    if (_disposed || !productionEnabled || _captureInProgress) return;
    usingFrontCamera = snapshot.activeLens?.facing == CameraLensFacing.front;
    cameraStage = switch (snapshot.phase) {
      CameraCapturePhase.idle => CameraStage.beforePermission,
      CameraCapturePhase.requestingPermission ||
      CameraCapturePhase.opening => CameraStage.requestingPermission,
      CameraCapturePhase.ready => CameraStage.active,
      CameraCapturePhase.capturing => CameraStage.aiProcessing,
      CameraCapturePhase.permissionDenied => CameraStage.denied,
      CameraCapturePhase.suspended => CameraStage.idle,
      CameraCapturePhase.unavailable ||
      CameraCapturePhase.failed ||
      CameraCapturePhase.disposed => CameraStage.unavailable,
    };
    if (snapshot.errorMessage != null) {
      productionError = snapshot.errorMessage;
    }
    final cannotRunInference = switch (snapshot.phase) {
      CameraCapturePhase.idle ||
      CameraCapturePhase.permissionDenied ||
      CameraCapturePhase.suspended ||
      CameraCapturePhase.unavailable ||
      CameraCapturePhase.failed ||
      CameraCapturePhase.disposed => true,
      CameraCapturePhase.requestingPermission ||
      CameraCapturePhase.opening ||
      CameraCapturePhase.ready ||
      CameraCapturePhase.capturing => false,
    };
    if (cannotRunInference) {
      _inferenceTimer?.cancel();
      _inferenceTimer = null;
      _syncWakeLock();
    }
    _notify();
  }

  Future<void> _switchProductionCamera() async {
    final camera = _cameraGateway;
    if (camera == null) return;
    try {
      _applyCameraSnapshot(await camera.switchLens());
      _savePreferences();
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    }
  }

  Future<void> _resumeProductionCamera() async {
    final camera = _cameraGateway;
    if (camera == null) return;
    try {
      _applyCameraSnapshot(await camera.resume());
      _configureInferenceTimer();
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    }
  }

  Future<void> _captureAndAnalyze({required bool measurementOnly}) async {
    final camera = _cameraGateway;
    final inference = _inferenceEngine;
    final repository = _productionRepository;
    final tankId = activeTankId;
    if (_captureInProgress ||
        camera == null ||
        inference == null ||
        repository == null ||
        tankId == null ||
        camera.snapshot.phase != CameraCapturePhase.ready) {
      return;
    }
    _captureInProgress = true;
    productionError = null;
    cameraStage = measurementOnly
        ? CameraStage.measuringTurbidity
        : CameraStage.aiProcessing;
    if (measurementOnly) lastTurbidityResult = null;
    _notify();
    try {
      final frame = await camera.capture(normalizedWaterLineY: _waterLineY);
      if (frame == null) return;
      latestCameraFrameBytes = Uint8List.fromList(frame.encodedBytes);
      await inference.initialize();
      final result = await inference.analyze(
        detectionRegion: frame.waterRegion,
        fullFrame: frame.fullFrame,
        detectionRegionInFullFrame: NormalizedImageRegion.belowWaterLine(
          frame.waterRegionTopNormalized,
        ),
        thresholds: FishInferenceThresholds(
          detectionConfidence: detectionConfidenceThreshold,
          classificationConfidence: speciesConfidenceThreshold,
        ),
      );
      if (result == null) return;
      lastTurbidityResult = '${result.turbidityFnu.toStringAsFixed(1)} FNU';
      heatmapCenters = result.classifiedCenters
          .map(
            (center) => NormalizedDetectionCenter(
              nx: center.nx,
              ny: center.ny,
              speciesId: center.speciesId,
            ),
          )
          .toList(growable: false);
      heatmapSourceDimensions = DetectionFrameDimensions(
        width: frame.fullFrame.width,
        height: frame.fullFrame.height,
      );
      await repository.writeReading(
        ProductionReadingDraft(
          tankId: tankId,
          clarityScore: result.clarityScore,
          turbidityFnu: result.turbidityFnu,
          fishCount: result.fishCount,
          fishCountConfidence: result.meanDetectionConfidence,
          speciesDetected: result.speciesCounts,
          detections: heatmapCenters,
          frameDimensions: heatmapSourceDimensions,
        ),
      );
      for (final entry in fish) {
        final detected = (result.speciesCounts[entry.speciesId] ?? 0).clamp(
          0,
          entry.count,
        );
        await repository.updateDetectedFish(entry.id, detected);
      }
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    } finally {
      _captureInProgress = false;
      if (!_disposed) {
        _applyCameraSnapshot(camera.snapshot);
        _notify();
      }
    }
  }

  void _configureInferenceTimer() {
    _inferenceTimer?.cancel();
    _inferenceTimer = null;
    if (!productionEnabled ||
        !aiEnabled ||
        !autoConnect ||
        activeTankId == null ||
        _productionRepository == null ||
        _inferenceEngine?.isSupported != true ||
        _cameraGateway?.snapshot.phase != CameraCapturePhase.ready) {
      _syncWakeLock();
      return;
    }
    final interval = Duration(
      milliseconds: pollingIntervalMs.round().clamp(1000, 3600000),
    );
    _inferenceTimer = Timer.periodic(interval, (_) {
      if (cameraStage == CameraStage.active) {
        unawaited(_captureAndAnalyze(measurementOnly: false));
      }
    });
    _syncWakeLock();
  }

  void _syncWakeLock() {
    final gateway = _wakeLockGateway;
    if (gateway == null) return;
    final shouldEnable =
        !_disposed && (_inferenceTimer != null || _publishingLive);
    if (shouldEnable == _wakeLockRequested) return;
    _wakeLockRequested = shouldEnable;
    _wakeLockQueue = _wakeLockQueue.then((_) async {
      try {
        await gateway.setEnabled(shouldEnable);
      } catch (error, stackTrace) {
        _recordProductionError(error, stackTrace);
      }
    });
  }

  void _handleLiveRequests(List<ProductionLiveRequest> requests) {
    _liveRequests = List.unmodifiable(requests);
    final canPublish =
        _tankRole == ProductionTankMemberRole.owner ||
        _tankRole == ProductionTankMemberRole.monitor;
    _liveRequestLeaseSweep?.cancel();
    _liveRequestLeaseSweep = null;
    if (!canPublish) {
      if (_publishingLive) unawaited(stopLiveStream());
      return;
    }
    _evaluateLiveRequestLeases();
    if (requests.isNotEmpty) {
      _liveRequestLeaseSweep = Timer.periodic(
        _liveRequestSweepInterval,
        (_) => _evaluateLiveRequestLeases(),
      );
    }
  }

  void _evaluateLiveRequestLeases() {
    if (_disposed) return;
    final canPublish =
        _tankRole == ProductionTankMemberRole.owner ||
        _tankRole == ProductionTankMemberRole.monitor;
    if (!canPublish) return;
    final oldestAccepted = DateTime.now().subtract(_liveRequestLeaseDuration);
    final hasFreshRequest = _liveRequests.any((request) {
      final requestedAt = request.requestedAt;
      return requestedAt != null && !requestedAt.isBefore(oldestAccepted);
    });
    if (hasFreshRequest && !_publishingLive) {
      unawaited(startMonitorLiveStream());
    } else if (!hasFreshRequest && _publishingLive) {
      unawaited(stopLiveStream());
    }
    if (!hasFreshRequest) {
      _liveRequestLeaseSweep?.cancel();
      _liveRequestLeaseSweep = null;
    }
  }

  Future<void> startViewerLiveStream() =>
      _enqueueLiveOperation(_startViewerLiveStream);

  Future<void> _startViewerLiveStream() async {
    final tankId = activeTankId;
    final repository = _productionRepository;
    final live = _liveGateway;
    if (!productionEnabled ||
        tankId == null ||
        repository == null ||
        live == null ||
        _viewingLive ||
        _publishingLive) {
      return;
    }
    var requestCreated = false;
    try {
      await repository.requestLive(tankId);
      requestCreated = true;
      await live.connect(tankId, role: OceanEyesLiveRole.viewer);
      _viewingLive = true;
      _liveRequestHeartbeat?.cancel();
      _liveRequestHeartbeat = Timer.periodic(_liveRequestHeartbeatInterval, (
        _,
      ) {
        _queueProductionWrite(() => repository.requestLive(tankId));
      });
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
      if (requestCreated) {
        try {
          await repository.clearLiveRequest(tankId);
        } catch (_) {
          // The lease expires even if best-effort cleanup cannot reach Firebase.
        }
      }
      try {
        await live.disconnect();
      } catch (_) {
        // Preserve the connection failure as the user-facing error.
      }
    }
  }

  Future<void> startMonitorLiveStream() =>
      _enqueueLiveOperation(_startMonitorLiveStream);

  Future<void> _startMonitorLiveStream() async {
    final tankId = activeTankId;
    final repository = _productionRepository;
    final camera = _cameraGateway;
    final live = _liveGateway;
    if (!productionEnabled ||
        tankId == null ||
        repository == null ||
        live == null ||
        _publishingLive ||
        _viewingLive ||
        (_tankRole != ProductionTankMemberRole.owner &&
            _tankRole != ProductionTankMemberRole.monitor)) {
      return;
    }
    _publishingLive = true;
    _syncWakeLock();
    var roomConnected = false;
    try {
      await camera?.suspend();
      if (camera != null) {
        await _settleCameraHandoff(
          _cameraHandoffConfiguration.afterCameraRelease,
        );
      }
      await live.connect(
        tankId,
        role: OceanEyesLiveRole.monitor,
        useFrontCamera: usingFrontCamera,
      );
      roomConnected = true;
      await repository.setLiveActive(tankId, true);
      _liveHeartbeat?.cancel();
      _liveHeartbeat = Timer.periodic(const Duration(seconds: 20), (_) {
        _queueProductionWrite(() => repository.pingLive(tankId));
      });
    } catch (error, stackTrace) {
      _publishingLive = false;
      _syncWakeLock();
      _recordProductionError(error, stackTrace);
      if (roomConnected) {
        try {
          await repository.setLiveActive(tankId, false);
        } catch (_) {
          // Best effort: last_ping_at lets consumers reject a stale live flag.
        }
      }
      try {
        await live.disconnect();
      } catch (_) {
        // Preserve the original startup failure.
      }
      try {
        if (camera != null) {
          await _settleCameraHandoff(
            _cameraHandoffConfiguration.afterLiveDisconnect,
          );
        }
        await camera?.resume();
      } catch (_) {
        // Preserve the original startup failure.
      }
    }
  }

  Future<void> stopLiveStream() =>
      _enqueueLiveOperation(() => _stopLiveSession(clearRequest: true));

  Future<void> _enqueueLiveOperation(Future<void> Function() operation) {
    final result = _liveOperationQueue.then((_) => operation());
    _liveOperationQueue = result.then<void>(
      (_) {},
      onError: (Object error, StackTrace stackTrace) {
        _recordProductionError(error, stackTrace);
      },
    );
    return result;
  }

  Future<void> _stopLiveSession({
    required bool clearRequest,
    String? tankIdOverride,
    bool resumeCamera = true,
  }) async {
    final tankId = tankIdOverride ?? activeTankId;
    final repository = _productionRepository;
    final live = _liveGateway;
    _liveHeartbeat?.cancel();
    _liveHeartbeat = null;
    _liveRequestHeartbeat?.cancel();
    _liveRequestHeartbeat = null;
    _liveRequestLeaseSweep?.cancel();
    _liveRequestLeaseSweep = null;
    final wasPublishing = _publishingLive;
    final wasViewing = _viewingLive;
    if (tankId != null && repository != null) {
      if (wasPublishing) {
        try {
          await repository.setLiveActive(tankId, false);
        } catch (error, stackTrace) {
          _recordProductionError(error, stackTrace);
        }
      }
      if (clearRequest && wasViewing) {
        try {
          await repository.clearLiveRequest(tankId);
        } catch (error, stackTrace) {
          _recordProductionError(error, stackTrace);
        }
      }
    }
    try {
      await live?.disconnect();
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    }
    _publishingLive = false;
    _viewingLive = false;
    _syncWakeLock();
    if (wasPublishing && resumeCamera) {
      try {
        if (_cameraGateway != null) {
          await _settleCameraHandoff(
            _cameraHandoffConfiguration.afterLiveDisconnect,
          );
        }
        await _cameraGateway?.resume();
      } catch (error, stackTrace) {
        _recordProductionError(error, stackTrace);
      }
    }
  }

  Future<void> _settleCameraHandoff(Duration duration) {
    if (duration == Duration.zero || duration.isNegative) {
      return Future<void>.value();
    }
    return _cameraHandoffDelay(duration);
  }

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

  final FishInventoryRepository? _inventoryRepository;
  final OceanEyesSettingsRepository? _settingsRepository;
  final SharedPreferences? _preferences;
  final ProductionOceanEyesRepository? _productionRepository;
  final ProductionAuthGateway? _productionAuth;
  final CameraCaptureGateway? _cameraGateway;
  final FishInferenceEngine? _inferenceEngine;
  final NotificationServiceGateway? _notificationService;
  final OceanEyesLiveGateway? _liveGateway;
  final WakeLockGateway? _wakeLockGateway;
  final CameraHandoffConfiguration _cameraHandoffConfiguration;
  final CameraHandoffDelay _cameraHandoffDelay;
  final String _webPushVapidKey;
  Future<void> _inventoryWriteQueue = Future<void>.value();
  Future<void> _settingsWriteQueue = Future<void>.value();
  Future<void> _productionWriteQueue = Future<void>.value();
  Future<void> _liveOperationQueue = Future<void>.value();
  Future<void> _wakeLockQueue = Future<void>.value();
  Future<void> _linkedTankRebindQueue = Future<void>.value();
  final List<StreamSubscription<dynamic>> _productionSubscriptions = [];
  final List<StreamSubscription<dynamic>> _tankSubscriptions = [];
  StreamSubscription<List<String>>? _linkedTankIdsSubscription;
  Timer? _inferenceTimer;
  Timer? _liveHeartbeat;
  Timer? _liveRequestHeartbeat;
  Timer? _liveRequestLeaseSweep;
  bool _disposed = false;
  bool _productionInitialized = false;
  bool _captureInProgress = false;
  bool _publishingLive = false;
  bool _viewingLive = false;
  bool _wakeLockRequested = false;
  int _pairingCameraSuspensionDepth = 0;
  bool _resumeCameraAfterPairing = false;
  int _linkedTankSubscriptionGeneration = 0;
  String? _linkedTankTargetUid;
  String? _linkedTankSubscriptionUid;
  double? _waterLineY;
  ProductionTankMemberRole _tankRole = ProductionTankMemberRole.none;
  List<ProductionLiveRequest> _liveRequests = const [];
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
  static const Duration _liveRequestHeartbeatInterval = Duration(seconds: 20);
  static const Duration _liveRequestLeaseDuration = Duration(seconds: 60);
  static const Duration _liveRequestSweepInterval = Duration(seconds: 5);

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

  /// True only for an explicitly enabled, successfully composed production
  /// runtime. Fixture and directly constructed controllers always leave this
  /// false and never touch platform plugins.
  final bool productionEnabled;
  String? productionError;
  bool pairingInProgress = false;
  bool recalibrationRequested = false;
  String? activeTankId;
  ProductionAuthUser? productionUser;
  ProductionLiveState? liveState;
  Object? remoteVideoTrack;
  OceanEyesLiveConnectionState liveConnectionState =
      OceanEyesLiveConnectionState.disconnected;
  Uint8List? latestCameraFrameBytes;

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
    final auth = _productionAuth;
    if (!productionEnabled || auth == null || isAuthenticating) return;
    isAuthenticating = true;
    productionError = null;
    _notify();
    final token = _notificationService?.currentToken;
    try {
      final result = await auth.linkGoogleAccount(fcmToken: token);
      productionUser = result.user ?? auth.currentUser;
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
      productionEnabled && (_productionAuth?.hasLinkedAccount ?? false);
  String get tankReferenceCode => activeTankId ?? 'tank-demo';
  bool get canEditTankSettings =>
      !productionEnabled || _tankRole == ProductionTankMemberRole.owner;
  bool get canCalibrateTank =>
      !productionEnabled ||
      _tankRole == ProductionTankMemberRole.owner ||
      _tankRole == ProductionTankMemberRole.monitor;
  double get waterLineCalibration =>
      (_waterLineY ?? 0.42).clamp(0, 1).toDouble();
  bool get isLiveConnected =>
      liveConnectionState == OceanEyesLiveConnectionState.connected;

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
      final camera = _cameraGateway;
      if (camera == null) {
        cameraStage = CameraStage.unavailable;
        productionError = 'Camera capture is not supported on this platform.';
        _notify();
        return;
      }
      try {
        _applyCameraSnapshot(await camera.initialize());
        _configureInferenceTimer();
      } catch (error, stackTrace) {
        _recordProductionError(error, stackTrace);
        _applyCameraSnapshot(camera.snapshot);
      }
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
      final camera = _cameraGateway;
      if (camera == null) return;
      unawaited(_switchProductionCamera());
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
      _configureInferenceTimer();
      _notify();
      if (enabled && cameraStage == CameraStage.active) {
        unawaited(_captureAndAnalyze(measurementOnly: false));
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
      unawaited(_captureAndAnalyze(measurementOnly: true));
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
        unawaited(startViewerLiveStream());
      } else {
        unawaited(stopLiveStream());
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
      _configureInferenceTimer();
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
    if (productionEnabled) _configureInferenceTimer();
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
    for (final entry in fish) {
      _fishVisibilityById[entry.id] = entry.visible;
    }
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
    await Future.wait([
      _inventoryWriteQueue,
      _settingsWriteQueue,
      _productionWriteQueue,
    ]);
  }

  void handleAppLifecycleState(AppLifecycleState state) {
    if (!productionEnabled || _cameraGateway == null) return;
    switch (state) {
      case AppLifecycleState.resumed:
        if (!_publishingLive && tankConnected) {
          unawaited(_resumeProductionCamera());
        }
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        _inferenceTimer?.cancel();
        _inferenceTimer = null;
        _syncWakeLock();
        if (!_publishingLive) unawaited(_cameraGateway.suspend());
        break;
    }
  }

  /// Temporarily releases the production camera for the QR scanner.
  ///
  /// Calls may be nested by presentation code. Only the outermost matching
  /// resume reopens a camera that was active before pairing began.
  Future<void> suspendCameraForPairing() async {
    final camera = _cameraGateway;
    if (!productionEnabled || camera == null || _disposed) return;
    _pairingCameraSuspensionDepth += 1;
    if (_pairingCameraSuspensionDepth > 1) return;

    // LiveKit and the QR scanner cannot safely own the same hardware camera.
    // The serialized stop also drains a connection that was still starting.
    await stopLiveStream();
    if (_disposed) return;
    _inferenceTimer?.cancel();
    _inferenceTimer = null;
    _syncWakeLock();
    _resumeCameraAfterPairing = switch (camera.snapshot.phase) {
      CameraCapturePhase.requestingPermission ||
      CameraCapturePhase.opening ||
      CameraCapturePhase.ready ||
      CameraCapturePhase.capturing => true,
      _ => false,
    };
    if (!_resumeCameraAfterPairing) return;
    try {
      await camera.suspend();
      await _settleCameraHandoff(
        _cameraHandoffConfiguration.afterCameraRelease,
      );
    } catch (error, stackTrace) {
      _recordProductionError(error, stackTrace);
    }
  }

  Future<void> resumeCameraAfterPairing() async {
    final camera = _cameraGateway;
    if (!productionEnabled || camera == null || _disposed) return;
    if (_pairingCameraSuspensionDepth == 0) return;
    _pairingCameraSuspensionDepth -= 1;
    if (_pairingCameraSuspensionDepth > 0) return;

    final shouldResume = _resumeCameraAfterPairing;
    _resumeCameraAfterPairing = false;
    if (shouldResume && !_publishingLive) {
      try {
        _applyCameraSnapshot(await camera.resume());
      } catch (error, stackTrace) {
        _recordProductionError(error, stackTrace);
      }
    }
    _configureInferenceTimer();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    final liveTankId = activeTankId;
    _disposed = true;
    _linkedTankSubscriptionGeneration += 1;
    _linkedTankTargetUid = null;
    _linkedTankSubscriptionUid = null;
    _inferenceTimer?.cancel();
    _liveHeartbeat?.cancel();
    _liveRequestHeartbeat?.cancel();
    _liveRequestLeaseSweep?.cancel();
    _syncWakeLock();
    unawaited(_linkedTankIdsSubscription?.cancel());
    _linkedTankIdsSubscription = null;
    for (final subscription in _tankSubscriptions) {
      unawaited(subscription.cancel());
    }
    for (final subscription in _productionSubscriptions) {
      unawaited(subscription.cancel());
    }
    final liveCleanup = _enqueueLiveOperation(
      () => _stopLiveSession(
        clearRequest: true,
        tankIdOverride: liveTankId,
        resumeCamera: false,
      ),
    );
    unawaited(
      liveCleanup.whenComplete(() async {
        await _liveGateway?.dispose();
        await _cameraGateway?.dispose();
      }),
    );
    unawaited(_notificationService?.dispose());
    unawaited(_inferenceEngine?.dispose());
    final wakeLock = _wakeLockGateway;
    if (wakeLock != null) {
      unawaited(_wakeLockQueue.whenComplete(wakeLock.dispose));
    }
    super.dispose();
  }
}

Future<void> _defaultCameraHandoffDelay(Duration duration) =>
    Future<void>.delayed(duration);
