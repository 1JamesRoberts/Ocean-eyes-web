import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/widgets.dart';
import 'package:image/image.dart' as image;
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'package:oceaneyes/integrations/camera/camera_capture_gateway.dart';
import 'package:oceaneyes/integrations/livekit/livekit_gateway.dart';
import 'package:oceaneyes/integrations/ml/onnx_fish_inference.dart';
import 'package:oceaneyes/integrations/power/wake_lock_gateway.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/models/production_auth.dart';
import 'package:oceaneyes/models/production_data.dart';
import 'package:oceaneyes/models/production_repository.dart';
import 'package:oceaneyes/models/tank_pairing_codec.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

void main() {
  test('direct and fixture controllers perform no production work', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final direct = OceanEyesController(
      productionRepository: repository,
      productionAuth: auth,
    );
    final fixture = OceanEyesController(
      productionRepository: repository,
      productionAuth: auth,
      launchUri: Uri.parse('https://oceaneyes.test/?fixture=populated'),
    );

    await direct.initializeProduction();
    await fixture.initializeProduction();

    expect(repository.interactions, 0);
    expect(auth.interactions, 0);
    expect(direct.productionEnabled, isFalse);
    expect(fixture.productionEnabled, isFalse);
    expect(fixture.fixtureScenario, FixtureScenario.populated);

    direct.dispose();
    fixture.dispose();
    await repository.close();
    await auth.close();
  });

  test(
    'production stays gated until Google auth and returns there on sign-out',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: null);
      final controller = _productionController(repository, auth);

      await controller.initializeProduction();

      expect(controller.isAuthenticated, isFalse);
      expect(controller.productionUser, isNull);
      expect(repository.callCount('watchLinkedTankIds'), 0);

      auth.emitUser(_user);
      await _drainMicrotasks();
      expect(controller.isAuthenticated, isTrue);
      expect(controller.productionUser?.uid, _user.uid);
      expect(repository.callCount('watchLinkedTankIds'), 1);

      await controller.signOut();
      await _drainMicrotasks();
      expect(controller.isAuthenticated, isFalse);
      expect(controller.productionUser, isNull);
      expect(repository.linkedTankIdsHasListenerFor(_user.uid), isFalse);

      controller.dispose();
      await _drainMicrotasks();
      await repository.close();
      await auth.close();
    },
  );

  testWidgets('account sign-out restores the full-screen Google login gate', (
    tester,
  ) async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final controller = _productionController(repository, auth)
      ..activeTab = PrimaryTab.account;
    await controller.initializeProduction();

    await tester.pumpWidget(OceanEyesApp(controller: controller));
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('Signed in with Google'), findsOneWidget);

    await tester.tap(find.text('Sign out'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(controller.isAuthenticated, isFalse);
    expect(find.text('Continue with Google'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
    await tester.pump();
    await repository.close();
    await auth.close();
  });

  test(
    'fixture pairing and creation stay local while matching production flow',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: _user);
      final controller = OceanEyesController(
        productionRepository: repository,
        productionAuth: auth,
        launchUri: Uri.parse('https://oceaneyes.test/'),
      );

      controller.disconnectTank();
      expect(controller.tankConnected, isFalse);

      final paired = await controller.pairTankPayload(
        TankPairingCodec.encode(
          const TankPairingPayload(tankId: 'tank-paired'),
        ),
      );

      expect(paired, isTrue);
      expect(controller.productionEnabled, isFalse);
      expect(controller.tankConnected, isTrue);
      expect(controller.cameraStage, CameraStage.active);
      expect(controller.tankReferenceCode, 'tank-demo');
      expect(repository.interactions, 0);

      controller.disconnectTank();
      final created = await controller.createProductionTank('Local Reef');

      expect(created, 'tank-demo');
      expect(controller.tankConnected, isTrue);
      expect(controller.tankName, 'Local Reef');
      expect(controller.cameraStage, CameraStage.active);
      expect(repository.interactions, 0);

      controller.dispose();
      await repository.close();
      await auth.close();
    },
  );

  test('production onboarding waits for the linked-tank lookup', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final controller = _productionController(repository, auth);

    await controller.initializeProduction();
    expect(controller.shouldShowOnboarding, isFalse);

    repository.emitLinkedTankIds(const []);
    await _drainMicrotasks();
    expect(controller.shouldShowOnboarding, isTrue);
    expect(controller.showTankSetupBanner, isTrue);

    controller.postponeOnboarding();
    expect(controller.shouldShowOnboarding, isFalse);
    expect(controller.showTankSetupBanner, isTrue);

    controller.dispose();
    await _drainMicrotasks();
    await repository.close();
    await auth.close();
  });

  test(
    'existing linked tanks bypass onboarding and keep selection behavior',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: _user);
      final controller = _productionController(repository, auth);

      await controller.initializeProduction();
      repository.emitLinkedTankIds(const ['tank-existing']);
      await _drainMicrotasks();

      expect(controller.shouldShowOnboarding, isFalse);
      expect(controller.activeTankId, 'tank-existing');
      expect(controller.tankConnected, isTrue);

      controller.dispose();
      await _drainMicrotasks();
      await repository.close();
      await auth.close();
    },
  );

  test('production controllers ignore fixture query parameters', () {
    final controller = OceanEyesController(
      productionEnabled: true,
      launchUri: Uri.parse('https://oceaneyes.test/?fixture=populated'),
    );

    expect(controller.productionEnabled, isTrue);
    expect(controller.fixtureScenario, FixtureScenario.dashboardWaiting);
    expect(controller.fish, isEmpty);

    controller.dispose();
  });

  test('production binding applies one reading bundle, fish, and alerts '
      'deterministically', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final controller = _productionController(repository, auth);

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-z', 'tank-a', 'tank-a']);
    await _drainMicrotasks();

    expect(controller.activeTankId, 'tank-a');
    expect(repository.callCount('watchReadingBundle:tank-a'), 1);
    expect(repository.callCount('watchFishInventory:tank-a'), 1);
    expect(repository.callCount('watchAlerts:tank-a'), 1);
    expect(repository.callCount('watchReadings:tank-a'), 0);
    expect(repository.callCount('watchHistory:tank-a'), 0);
    expect(repository.callCount('watchAnalytics:tank-a'), 0);

    final streams = repository.streamsFor('tank-a');
    streams.tank.add(_tank('tank-a', name: 'Office Reef'));
    streams.readingBundle.add(_readingBundle);
    streams.fish.add(const [_remoteFish]);
    streams.alerts.add(const [_productionAlert]);

    expect(controller.tankConnected, isTrue);
    expect(controller.tankName, 'Office Reef');
    expect(controller.clarityThreshold, 5);
    expect(controller.visibleFishThreshold, 40);
    expect(controller.dashboardHealth, DashboardHealthState.warning);
    expect(controller.lastTurbidityResult, '6.0 FNU');
    expect(
      controller.waterMetrics
          .singleWhere((metric) => metric.label == 'Turbidity')
          .value,
      '6.00',
    );
    expect(controller.history, _readingBundle.history);
    expect(controller.analyticsState, AnalyticsContentState.populated);
    expect(controller.claritySeries, const [ChartPoint('10:00', 80)]);
    expect(controller.fish.single.id, _remoteFish.id);
    expect(controller.alerts.single.id, _productionAlert.item.id);

    // Visibility belongs to presentation preferences. A new Firestore
    // snapshot may update counts but must not overwrite this local choice.
    controller.toggleFishVisibility(_remoteFish.id);
    expect(controller.fish.single.visible, isFalse);
    streams.fish.add(const [
      FishEntry(
        id: 'fish-1',
        speciesId: 'neon_tetra',
        name: 'Neon Tetra',
        scientificName: 'Paracheirodon innesi',
        assetPath: 'assets/images/fish/neon_tetra.png',
        count: 4,
        detected: 3,
        compatibility: 'Community',
        careLevel: 'Easy',
        visible: true,
      ),
    ]);
    expect(controller.fish.single.count, 4);
    expect(controller.fish.single.detected, 3);
    expect(controller.fish.single.visible, isFalse);

    controller.dispose();
    await _drainMicrotasks();
    await repository.close();
    await auth.close();
  });

  test('pairing joins and immediately selects the paired tank', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final controller = _productionController(repository, auth);

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();
    expect(controller.activeTankId, 'tank-a');

    final paired = await controller.pairTankPayload(
      TankPairingCodec.encode(const TankPairingPayload(tankId: 'tank-paired')),
    );

    expect(paired, isTrue);
    expect(repository.joinedTankIds, const ['tank-paired']);
    expect(controller.activeTankId, 'tank-paired');
    expect(controller.tankConnected, isTrue);
    expect(controller.pairingInProgress, isFalse);
    expect(repository.callCount('watchTank:tank-paired'), 1);
    expect(repository.streamsFor('tank-a').cancellations, 6);

    repository
        .streamsFor('tank-paired')
        .tank
        .add(_tank('tank-paired', name: 'Paired Reef'));
    expect(controller.tankName, 'Paired Reef');

    controller.dispose();
    await _drainMicrotasks();
    await repository.close();
    await auth.close();
  });

  test(
    'dispose cancels root and tank-scoped production subscriptions',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: _user);
      final controller = _productionController(repository, auth);

      await controller.initializeProduction();
      repository.emitLinkedTankIds(const ['tank-a']);
      await _drainMicrotasks();
      final tankStreams = repository.streamsFor('tank-a');

      expect(auth.authStateHasListener, isTrue);
      expect(repository.linkedTankIdsHasListener, isTrue);
      expect(tankStreams.activeListeners, 6);

      controller.dispose();
      await _drainMicrotasks();

      expect(auth.authStateCancellations, 1);
      expect(repository.linkedTankIdsCancellations, 1);
      expect(tankStreams.cancellations, 6);
      expect(tankStreams.activeListeners, 0);

      await repository.close();
      await auth.close();
    },
  );

  test('auth uid changes replace the linked-tank root subscription', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final controller = _productionController(repository, auth);

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-old']);
    await _drainMicrotasks();
    expect(controller.activeTankId, 'tank-old');

    const linkedUser = ProductionAuthUser(
      uid: 'user-2',
      providerIds: ['google.com'],
    );
    repository.currentUid = linkedUser.uid;
    auth.emitUser(linkedUser);
    await _drainMicrotasks();

    expect(repository.callCount('watchLinkedTankIds'), 2);
    expect(repository.linkedTankIdsHasListenerFor(_user.uid), isFalse);
    expect(repository.linkedTankIdsCancellationsFor(_user.uid), 1);
    expect(repository.linkedTankIdsHasListenerFor(linkedUser.uid), isTrue);
    expect(repository.streamsFor('tank-old').cancellations, 6);
    expect(controller.activeTankId, isNull);
    expect(controller.tankConnected, isFalse);

    // A late event from the previous account cannot retake the selection.
    repository.emitLinkedTankIds(const ['tank-stale'], uid: _user.uid);
    repository.emitLinkedTankIds(const ['tank-new'], uid: linkedUser.uid);
    await _drainMicrotasks();
    expect(controller.productionUser?.uid, linkedUser.uid);
    expect(controller.activeTankId, 'tank-new');
    expect(repository.callCount('watchTank:tank-stale'), 0);

    controller.dispose();
    await _drainMicrotasks();
    expect(repository.linkedTankIdsCancellationsFor(linkedUser.uid), 1);

    await repository.close();
    await auth.close();
  });

  test('production analytics retry never substitutes fixture data', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final controller = _productionController(repository, auth);

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();
    repository.streamsFor('tank-a').readingBundle.add(_readingBundle);
    expect(controller.claritySeries, const [ChartPoint('10:00', 80)]);

    controller.retryAnalytics();
    await Future<void>.delayed(const Duration(milliseconds: 700));

    expect(controller.analyticsState, AnalyticsContentState.loading);
    expect(controller.claritySeries, const [ChartPoint('10:00', 80)]);
    expect(controller.heatmapCenters, isEmpty);

    controller.dispose();
    await _drainMicrotasks();
    await repository.close();
    await auth.close();
  });

  test('automatic monitoring owns and releases the wake lock', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final wakeLock = _FakeWakeLockGateway();
    final camera = _FakeCameraCaptureGateway();
    final inference = _FakeInferenceEngine();
    final controller = _productionController(
      repository,
      auth,
      cameraGateway: camera,
      inferenceEngine: inference,
      wakeLockGateway: wakeLock,
    );

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();

    controller.setAutoConnect(true);
    await _drainMicrotasks();
    expect(wakeLock.enabledValues, const [true]);

    controller.setAutoConnect(false);
    await _drainMicrotasks();
    expect(wakeLock.enabledValues, const [true, false]);

    controller.setAutoConnect(true);
    await _drainMicrotasks();
    controller.dispose();
    await _drainMicrotasks();
    expect(wakeLock.enabledValues, const [true, false, true, false]);
    expect(wakeLock.disposeCalls, 1);

    await repository.close();
    await auth.close();
  });

  test('terminal camera states release automatic-monitor wake lock', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final wakeLock = _FakeWakeLockGateway();
    final camera = _FakeCameraCaptureGateway();
    final controller = _productionController(
      repository,
      auth,
      cameraGateway: camera,
      inferenceEngine: _FakeInferenceEngine(),
      wakeLockGateway: wakeLock,
    );

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();

    for (final phase in const [
      CameraCapturePhase.permissionDenied,
      CameraCapturePhase.failed,
      CameraCapturePhase.unavailable,
    ]) {
      camera.emitPhase(CameraCapturePhase.ready);
      controller.setAutoConnect(true);
      await _drainMicrotasks();
      expect(wakeLock.enabledValues.last, isTrue);

      camera.emitPhase(phase);
      await _drainMicrotasks();
      expect(wakeLock.enabledValues.last, isFalse);
    }

    controller.dispose();
    await _drainMicrotasks();
    await repository.close();
    await auth.close();
  });

  test(
    'backgrounding resumes the camera and denied permission stays recoverable',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: _user);
      final camera = _FakeCameraCaptureGateway();
      final controller = _productionController(
        repository,
        auth,
        cameraGateway: camera,
      );

      await controller.initializeProduction();
      repository.emitLinkedTankIds(const ['tank-a']);
      await _drainMicrotasks();

      controller.handleAppLifecycleState(AppLifecycleState.paused);
      await _drainMicrotasks();
      expect(camera.suspendCalls, 1);

      controller.handleAppLifecycleState(AppLifecycleState.resumed);
      await _drainMicrotasks();
      expect(camera.resumeCalls, 1);
      expect(controller.cameraStage, CameraStage.active);

      camera.emitPhase(CameraCapturePhase.permissionDenied);
      await _drainMicrotasks();
      expect(controller.cameraStage, CameraStage.denied);
      await controller.requestCameraPermission();
      expect(controller.cameraStage, CameraStage.denied);

      controller.dispose();
      await _drainMicrotasks();
      await repository.close();
      await auth.close();
    },
  );

  test('LiveKit publishing owns and releases the wake lock', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final wakeLock = _FakeWakeLockGateway();
    final camera = _FakeCameraCaptureGateway();
    final live = _FakeLiveGateway();
    final controller = _productionController(
      repository,
      auth,
      cameraGateway: camera,
      liveGateway: live,
      wakeLockGateway: wakeLock,
    );

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();
    repository
        .streamsFor('tank-a')
        .tank
        .add(_tank('tank-a', name: 'Office Reef'));
    final disconnectsBeforeStart = live.disconnectCalls;

    await controller.startMonitorLiveStream();
    await _drainMicrotasks();
    expect(wakeLock.enabledValues, const [true]);
    expect(live.connectRoles, const [OceanEyesLiveRole.monitor]);
    expect(repository.liveActiveValues, const [true]);

    await controller.stopLiveStream();
    await _drainMicrotasks();
    expect(wakeLock.enabledValues, const [true, false]);
    expect(repository.liveActiveValues, const [true, false]);
    expect(live.disconnectCalls, disconnectsBeforeStart + 1);

    controller.dispose();
    await _drainMicrotasks();
    expect(wakeLock.disposeCalls, 1);

    await repository.close();
    await auth.close();
  });

  test('connecting an idle camera resumes the production gateway', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final camera = _FakeCameraCaptureGateway();
    final controller = _productionController(
      repository,
      auth,
      cameraGateway: camera,
    );

    await controller.initializeProduction();
    camera.emitPhase(CameraCapturePhase.suspended);
    expect(controller.cameraStage, CameraStage.idle);

    await controller.connectStream();

    expect(camera.resumeCalls, 1);
    expect(controller.cameraStage, CameraStage.active);

    controller.dispose();
    await _drainMicrotasks();
    await repository.close();
    await auth.close();
  });

  test('unexpected publisher disconnect fully releases live session', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final wakeLock = _FakeWakeLockGateway();
    final camera = _FakeCameraCaptureGateway();
    final live = _FakeLiveGateway();
    final controller = _productionController(
      repository,
      auth,
      cameraGateway: camera,
      liveGateway: live,
      wakeLockGateway: wakeLock,
    );

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();
    repository
        .streamsFor('tank-a')
        .tank
        .add(_tank('tank-a', name: 'Office Reef'));
    final disconnectsBeforeStart = live.disconnectCalls;

    await controller.startMonitorLiveStream();
    live.emit(OceanEyesLiveConnectionState.connected);
    live.emit(
      OceanEyesLiveConnectionState.disconnected,
      error: StateError('server disconnected'),
    );

    await _waitUntil(
      () =>
          repository.liveActiveValues.length == 2 &&
          camera.resumeCalls == 1 &&
          wakeLock.enabledValues.last == false,
    );
    expect(repository.liveActiveValues, const [true, false]);
    expect(controller.isLiveConnected, isFalse);
    expect(controller.remoteVideoTrack, isNull);
    expect(live.disconnectCalls, disconnectsBeforeStart + 1);

    await controller.startMonitorLiveStream();
    expect(live.connectRoles, const [
      OceanEyesLiveRole.monitor,
      OceanEyesLiveRole.monitor,
    ]);

    controller.dispose();
    await live.disposed;
    await repository.close();
    await auth.close();
  });

  test(
    'reconnect and token expiry leave viewer live session restartable',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: _user);
      final live = _FakeLiveGateway();
      final controller = _productionController(
        repository,
        auth,
        liveGateway: live,
      );

      await controller.initializeProduction();
      repository.emitLinkedTankIds(const ['tank-a']);
      await _drainMicrotasks();
      final disconnectsBeforeStart = live.disconnectCalls;

      await controller.startViewerLiveStream();
      live.emit(OceanEyesLiveConnectionState.connected);
      live.emit(OceanEyesLiveConnectionState.reconnecting);
      live.emit(OceanEyesLiveConnectionState.connected);
      expect(controller.isLiveConnected, isTrue);
      live.emit(
        OceanEyesLiveConnectionState.disconnected,
        error: StateError('token expired'),
      );

      await _waitUntil(
        () =>
            repository.clearedLiveRequestTankIds.isNotEmpty &&
            live.disconnectCalls == disconnectsBeforeStart + 1,
      );
      expect(repository.requestedLiveTankIds, const ['tank-a']);
      expect(repository.clearedLiveRequestTankIds, const ['tank-a']);
      expect(controller.isLiveConnected, isFalse);

      await controller.startViewerLiveStream();
      expect(live.connectRoles, const [
        OceanEyesLiveRole.viewer,
        OceanEyesLiveRole.viewer,
      ]);

      controller.dispose();
      await live.disposed;
      await repository.close();
      await auth.close();
    },
  );

  test(
    'camera and LiveKit ownership handoffs use injected settle times',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: _user);
      final camera = _FakeCameraCaptureGateway();
      final live = _FakeLiveGateway();
      final delays = <Duration>[];
      const timing = CameraHandoffConfiguration(
        afterCameraRelease: Duration(milliseconds: 17),
        afterLiveDisconnect: Duration(milliseconds: 23),
      );
      final controller = _productionController(
        repository,
        auth,
        cameraGateway: camera,
        liveGateway: live,
        cameraHandoffConfiguration: timing,
        cameraHandoffDelay: (duration) async => delays.add(duration),
      );

      await controller.initializeProduction();
      repository.emitLinkedTankIds(const ['tank-a']);
      await _drainMicrotasks();
      repository
          .streamsFor('tank-a')
          .tank
          .add(_tank('tank-a', name: 'Office Reef'));

      await controller.startMonitorLiveStream();
      await controller.stopLiveStream();

      expect(delays, const [
        Duration(milliseconds: 17),
        Duration(milliseconds: 23),
      ]);
      expect(camera.suspendCalls, 1);
      expect(camera.resumeCalls, 1);

      controller.dispose();
      await live.disposed;
      await repository.close();
      await auth.close();
    },
  );

  test(
    'water-line calibration previews locally and persists on commit',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: _user);
      final controller = _productionController(repository, auth);

      await controller.initializeProduction();
      repository.emitLinkedTankIds(const ['tank-a']);
      await _drainMicrotasks();
      repository
          .streamsFor('tank-a')
          .tank
          .add(_tank('tank-a', name: 'Office Reef'));

      expect(controller.waterLineCalibration, 0.2);
      controller.previewWaterLineCalibration(0.65);
      expect(controller.waterLineCalibration, 0.65);
      expect(repository.calibrationValues, isEmpty);

      controller.setWaterLineCalibration(0.65);
      await controller.flushPersistence();

      expect(repository.calibrationValues, const [0.65]);
      expect(repository.recalibrationValues, const [false]);
      expect(controller.recalibrationRequested, isFalse);

      controller.dispose();
      await _drainMicrotasks();
      await repository.close();
      await auth.close();
    },
  );

  test('viewer connect failure clears its request and disconnects', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final live = _FakeLiveGateway()
      ..connectError = StateError('viewer connect failed');
    final controller = _productionController(
      repository,
      auth,
      liveGateway: live,
    );

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();
    final disconnectsBeforeStart = live.disconnectCalls;

    await controller.startViewerLiveStream();

    expect(repository.requestedLiveTankIds, const ['tank-a']);
    expect(repository.clearedLiveRequestTankIds, const ['tank-a']);
    expect(live.connectRoles, const [OceanEyesLiveRole.viewer]);
    expect(live.disconnectCalls, disconnectsBeforeStart + 1);

    controller.dispose();
    await live.disposed;
    await repository.close();
    await auth.close();
  });

  test('dispose waits for a pending viewer start before cleanup', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final live = _FakeLiveGateway();
    final requestGate = Completer<void>();
    repository.requestLiveGate = requestGate;
    final controller = _productionController(
      repository,
      auth,
      liveGateway: live,
    );

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();

    final start = controller.startViewerLiveStream();
    await _waitUntil(() => repository.requestedLiveTankIds.isNotEmpty);
    controller.dispose();
    requestGate.complete();

    await start;
    await live.disposed;
    expect(repository.clearedLiveRequestTankIds, const ['tank-a']);
    expect(live.connectRoles, const [OceanEyesLiveRole.viewer]);
    expect(live.disposeCalls, 1);

    await repository.close();
    await auth.close();
  });

  test('only a fresh live request starts monitor publishing', () async {
    final repository = _FakeProductionRepository();
    final auth = _FakeProductionAuth(user: _user);
    final live = _FakeLiveGateway();
    final camera = _FakeCameraCaptureGateway();
    final controller = _productionController(
      repository,
      auth,
      cameraGateway: camera,
      liveGateway: live,
    );

    await controller.initializeProduction();
    repository.emitLinkedTankIds(const ['tank-a']);
    await _drainMicrotasks();
    final streams = repository.streamsFor('tank-a');
    streams.tank.add(_tank('tank-a', name: 'Office Reef'));

    streams.liveRequests.add([
      ProductionLiveRequest(
        userId: 'viewer-stale',
        requestedAt: DateTime.now().subtract(const Duration(minutes: 2)),
      ),
    ]);
    await _drainMicrotasks();
    expect(live.connectRoles, isEmpty);

    streams.liveRequests.add([
      ProductionLiveRequest(
        userId: 'viewer-fresh',
        requestedAt: DateTime.now(),
      ),
    ]);
    await _waitUntil(() => live.connectRoles.isNotEmpty);
    expect(live.connectRoles, const [OceanEyesLiveRole.monitor]);
    expect(repository.liveActiveValues, const [true]);

    // A viewer crash leaves its bearer request behind. The monitor must treat
    // the timestamp as a lease and release publishing without waiting for a
    // second viewer to connect.
    streams.liveRequests.add([
      ProductionLiveRequest(
        userId: 'viewer-crashed',
        requestedAt: DateTime.now().subtract(const Duration(minutes: 2)),
      ),
    ]);
    await _waitUntil(() => repository.liveActiveValues.length == 2);
    expect(repository.liveActiveValues, const [true, false]);

    controller.dispose();
    await live.disposed;
    await repository.close();
    await auth.close();
  });

  test(
    'QR pairing suspension releases and restores an active camera',
    () async {
      final repository = _FakeProductionRepository();
      final auth = _FakeProductionAuth(user: _user);
      final camera = _FakeCameraCaptureGateway();
      final controller = _productionController(
        repository,
        auth,
        cameraGateway: camera,
      );

      await controller.initializeProduction();
      await controller.suspendCameraForPairing();
      await controller.suspendCameraForPairing();
      expect(camera.suspendCalls, 1);

      await controller.resumeCameraAfterPairing();
      expect(camera.resumeCalls, 0);
      await controller.resumeCameraAfterPairing();
      expect(camera.resumeCalls, 1);

      controller.dispose();
      await _drainMicrotasks();
      await repository.close();
      await auth.close();
    },
  );
}

OceanEyesController _productionController(
  _FakeProductionRepository repository,
  _FakeProductionAuth auth, {
  CameraCaptureGateway? cameraGateway,
  FishInferenceEngine? inferenceEngine,
  OceanEyesLiveGateway? liveGateway,
  WakeLockGateway? wakeLockGateway,
  CameraHandoffConfiguration cameraHandoffConfiguration =
      const CameraHandoffConfiguration.none(),
  CameraHandoffDelay? cameraHandoffDelay,
}) {
  return OceanEyesController(
    productionEnabled: true,
    productionRepository: repository,
    productionAuth: auth,
    cameraGateway: cameraGateway,
    inferenceEngine: inferenceEngine,
    liveGateway: liveGateway,
    wakeLockGateway: wakeLockGateway,
    cameraHandoffConfiguration: cameraHandoffConfiguration,
    cameraHandoffDelay: cameraHandoffDelay,
    launchUri: Uri.parse('https://oceaneyes.test/'),
  );
}

Future<void> _drainMicrotasks() async {
  for (var index = 0; index < 8; index++) {
    await Future<void>.delayed(Duration.zero);
  }
}

Future<void> _waitUntil(bool Function() condition) async {
  for (var index = 0; index < 100; index++) {
    if (condition()) return;
    await Future<void>.delayed(Duration.zero);
  }
  fail('Timed out waiting for an asynchronous controller transition.');
}

const _user = ProductionAuthUser(uid: 'user-1', providerIds: ['google.com']);

ProductionTank _tank(String id, {required String name}) {
  return ProductionTank(
    id: id,
    name: name,
    ownerId: _user.uid,
    monitorIds: const [],
    viewerIds: const [],
    thresholds: const ProductionTankThresholds(
      turbidityFnuMax: 5,
      clarityScoreMin: 9.2,
      visibleFishChangePercent: 40,
    ),
    recalibrationRequested: false,
    waterLineY: 0.2,
  );
}

const _remoteFish = FishEntry(
  id: 'fish-1',
  speciesId: 'neon_tetra',
  name: 'Neon Tetra',
  scientificName: 'Paracheirodon innesi',
  assetPath: 'assets/images/fish/neon_tetra.png',
  count: 3,
  detected: 2,
  compatibility: 'Community',
  careLevel: 'Easy',
);

const _productionAlert = ProductionAlert(
  id: 'alert-1',
  tankId: 'tank-a',
  type: 'turbidity',
  item: AlertItem(
    id: 'alert-1',
    title: 'Water clarity needs attention',
    message: 'Turbidity is above the configured maximum.',
    timeLabel: 'Just now',
    severity: AlertSeverity.warning,
    actionPlan: 'Inspect the filter.',
  ),
);

final _readingBundle = ProductionReadingBundle(
  readings: [
    ProductionReading(
      id: 'reading-1',
      tankId: 'tank-a',
      timestamp: DateTime.utc(2026, 8, 14, 10),
      clarityScore: 8,
      turbidityFnu: 6,
      fishCount: 2,
      fishCountConfidence: 0.9,
      speciesDetected: const {'neon_tetra': 2},
      frameUrl: '',
      detections: const [
        NormalizedDetectionCenter(nx: 0.25, ny: 0.75, speciesId: 'neon_tetra'),
      ],
      temperatureCelsius: 25,
      ph: 7.2,
      ammoniaPpm: 0,
      nitritePpm: 0,
      frameDimensions: const DetectionFrameDimensions(
        width: 1920,
        height: 1080,
      ),
    ),
  ],
  history: [
    HistoryReading(
      date: DateTime.utc(2026, 8, 14, 10),
      clarity: 8,
      fishCount: 2,
      summary: '2 fish visible',
    ),
  ],
  analytics: ProductionAnalyticsData(
    points: [
      ProductionAnalyticsPoint(
        timestamp: DateTime.utc(2026, 8, 14, 10),
        label: '10:00',
        clarityPercent: 80,
        fishCount: 2,
        speciesDetected: const {'neon_tetra': 2},
      ),
    ],
    claritySeries: const [ChartPoint('10:00', 80)],
    fishCountSeries: const [ChartPoint('10:00', 2)],
    speciesSeries: const {
      'neon_tetra': [ChartPoint('10:00', 2)],
    },
    heatmapCenters: const [
      NormalizedDetectionCenter(nx: 0.25, ny: 0.75, speciesId: 'neon_tetra'),
    ],
    heatmapSourceDimensions: const DetectionFrameDimensions(
      width: 1920,
      height: 1080,
    ),
  ),
);

final class _FakeProductionAuth implements ProductionAuthGateway {
  _FakeProductionAuth({required ProductionAuthUser? user}) : _user = user {
    _authStates = StreamController<ProductionAuthUser?>.broadcast(
      sync: true,
      onCancel: () => authStateCancellations++,
    );
  }

  ProductionAuthUser? _user;
  late final StreamController<ProductionAuthUser?> _authStates;
  int interactions = 0;
  int authStateCancellations = 0;

  bool get authStateHasListener => _authStates.hasListener;

  @override
  ProductionAuthUser? get currentUser {
    interactions++;
    return _user;
  }

  @override
  bool get isSignedIn {
    interactions++;
    return _user != null;
  }

  @override
  Stream<ProductionAuthUser?> authStateChanges() {
    interactions++;
    return _authStates.stream;
  }

  @override
  Future<void> enforceGoogleOnlySession() async {
    interactions++;
  }

  @override
  Future<GoogleSignInResult> signInWithGoogle() async {
    interactions++;
    return GoogleSignInResult(status: GoogleSignInStatus.signedIn, user: _user);
  }

  @override
  Future<void> signOut({String? fcmToken}) async {
    interactions++;
    _user = null;
    _authStates.add(null);
  }

  void emitUser(ProductionAuthUser user) {
    _user = user;
    _authStates.add(user);
  }

  Future<void> close() => _authStates.close();
}

final class _FakeProductionRepository implements ProductionOceanEyesRepository {
  final Map<String, StreamController<List<String>>> _linkedTankIdsByUid = {};
  final Map<String, int> _linkedTankCancellationsByUid = {};
  final Map<String, _TankStreams> _tankStreams = {};
  final Map<String, int> _calls = {};
  final List<String> joinedTankIds = [];
  final List<bool> liveActiveValues = [];
  final List<String> requestedLiveTankIds = [];
  final List<String> clearedLiveRequestTankIds = [];
  final List<double> calibrationValues = [];
  final List<bool> recalibrationValues = [];
  int interactions = 0;
  int linkedTankIdsCancellations = 0;
  bool joinResult = true;
  String currentUid = _user.uid;
  Completer<void>? requestLiveGate;

  bool get linkedTankIdsHasListener => linkedTankIdsHasListenerFor(currentUid);

  bool linkedTankIdsHasListenerFor(String uid) =>
      _linkedTankIdsByUid[uid]?.hasListener ?? false;

  int linkedTankIdsCancellationsFor(String uid) =>
      _linkedTankCancellationsByUid[uid] ?? 0;

  int callCount(String operation) => _calls[operation] ?? 0;

  _TankStreams streamsFor(String tankId) =>
      _tankStreams.putIfAbsent(tankId, _TankStreams.new);

  void emitLinkedTankIds(List<String> tankIds, {String? uid}) =>
      _linkedTankIdsController(uid ?? currentUid).add(tankIds);

  StreamController<List<String>> _linkedTankIdsController(String uid) =>
      _linkedTankIdsByUid.putIfAbsent(
        uid,
        () => StreamController<List<String>>.broadcast(
          sync: true,
          onCancel: () {
            linkedTankIdsCancellations++;
            _linkedTankCancellationsByUid.update(
              uid,
              (count) => count + 1,
              ifAbsent: () => 1,
            );
          },
        ),
      );

  void _record(String operation) {
    interactions++;
    _calls.update(operation, (count) => count + 1, ifAbsent: () => 1);
  }

  @override
  String? get currentUserId {
    _record('currentUserId');
    return currentUid;
  }

  @override
  Stream<List<String>> watchLinkedTankIds() {
    _record('watchLinkedTankIds');
    return _linkedTankIdsController(currentUid).stream;
  }

  @override
  Stream<ProductionTank?> watchTank(String tankId) {
    _record('watchTank:$tankId');
    return streamsFor(tankId).tank.stream;
  }

  @override
  Stream<ProductionReadingBundle> watchReadingBundle(
    String tankId, {
    int limit = 120,
  }) {
    _record('watchReadingBundle:$tankId');
    return streamsFor(tankId).readingBundle.stream;
  }

  @override
  Stream<List<FishEntry>> watchFishInventory(String tankId) {
    _record('watchFishInventory:$tankId');
    return streamsFor(tankId).fish.stream;
  }

  @override
  Stream<List<ProductionAlert>> watchAlerts(String tankId, {int limit = 40}) {
    _record('watchAlerts:$tankId');
    return streamsFor(tankId).alerts.stream;
  }

  @override
  Stream<ProductionLiveState?> watchLiveState(String tankId) {
    _record('watchLiveState:$tankId');
    return streamsFor(tankId).liveState.stream;
  }

  @override
  Stream<List<ProductionLiveRequest>> watchLiveRequests(String tankId) {
    _record('watchLiveRequests:$tankId');
    return streamsFor(tankId).liveRequests.stream;
  }

  @override
  Future<bool> joinTank(String tankId) async {
    _record('joinTank:$tankId');
    joinedTankIds.add(tankId);
    return joinResult;
  }

  @override
  Future<void> setLiveActive(String tankId, bool active) async {
    _record('setLiveActive:$tankId:$active');
    liveActiveValues.add(active);
  }

  @override
  Future<void> requestLive(String tankId) async {
    _record('requestLive:$tankId');
    requestedLiveTankIds.add(tankId);
    await requestLiveGate?.future;
  }

  @override
  Future<void> clearLiveRequest(String tankId) async {
    _record('clearLiveRequest:$tankId');
    clearedLiveRequestTankIds.add(tankId);
  }

  @override
  Future<void> updateCalibration(String tankId, double waterLineY) async {
    _record('updateCalibration:$tankId');
    calibrationValues.add(waterLineY);
  }

  @override
  Future<void> requestRecalibration(String tankId, bool requested) async {
    _record('requestRecalibration:$tankId:$requested');
    recalibrationValues.add(requested);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) {
    interactions++;
    return super.noSuchMethod(invocation);
  }

  Future<void> close() async {
    for (final controller in _linkedTankIdsByUid.values) {
      await controller.close();
    }
    for (final streams in _tankStreams.values) {
      await streams.close();
    }
  }
}

final class _TankStreams {
  _TankStreams() {
    tank = _controller<ProductionTank?>();
    readingBundle = _controller<ProductionReadingBundle>();
    fish = _controller<List<FishEntry>>();
    alerts = _controller<List<ProductionAlert>>();
    liveState = _controller<ProductionLiveState?>();
    liveRequests = _controller<List<ProductionLiveRequest>>();
  }

  late final StreamController<ProductionTank?> tank;
  late final StreamController<ProductionReadingBundle> readingBundle;
  late final StreamController<List<FishEntry>> fish;
  late final StreamController<List<ProductionAlert>> alerts;
  late final StreamController<ProductionLiveState?> liveState;
  late final StreamController<List<ProductionLiveRequest>> liveRequests;
  int cancellations = 0;

  int get activeListeners => [
    tank,
    readingBundle,
    fish,
    alerts,
    liveState,
    liveRequests,
  ].where((controller) => controller.hasListener).length;

  StreamController<T> _controller<T>() {
    return StreamController<T>.broadcast(
      sync: true,
      onCancel: () => cancellations++,
    );
  }

  Future<void> close() async {
    await tank.close();
    await readingBundle.close();
    await fish.close();
    await alerts.close();
    await liveState.close();
    await liveRequests.close();
  }
}

final class _FakeWakeLockGateway implements WakeLockGateway {
  final List<bool> enabledValues = [];
  int disposeCalls = 0;

  @override
  Future<void> setEnabled(bool enabled) async {
    enabledValues.add(enabled);
  }

  @override
  Future<void> dispose() async {
    disposeCalls += 1;
  }
}

final class _FakeCameraCaptureGateway implements CameraCaptureGateway {
  final StreamController<CameraCaptureSnapshot> _states =
      StreamController<CameraCaptureSnapshot>.broadcast(sync: true);
  CameraCaptureSnapshot _snapshot = const CameraCaptureSnapshot(
    phase: CameraCapturePhase.ready,
    permission: CameraPermissionState.granted,
  );
  int suspendCalls = 0;
  int resumeCalls = 0;

  @override
  bool get isSupported => true;

  @override
  CameraCaptureSnapshot get snapshot => _snapshot;

  @override
  Stream<CameraCaptureSnapshot> get states => _states.stream;

  void emitPhase(CameraCapturePhase phase) {
    _snapshot = _snapshot.copyWith(phase: phase);
    _states.add(_snapshot);
  }

  @override
  Future<CameraCaptureSnapshot> initialize({
    bool requestPermission = true,
  }) async => _snapshot;

  @override
  Future<CapturedCameraFrame?> capture({double? normalizedWaterLineY}) async =>
      null;

  @override
  Future<CameraCaptureSnapshot> setZoom(double zoom) async => _snapshot;

  @override
  Future<CameraCaptureSnapshot> switchLens() async => _snapshot;

  @override
  Future<void> suspend() async {
    suspendCalls += 1;
    _snapshot = _snapshot.copyWith(phase: CameraCapturePhase.suspended);
  }

  @override
  Future<CameraCaptureSnapshot> resume() async {
    resumeCalls += 1;
    _snapshot = _snapshot.copyWith(phase: CameraCapturePhase.ready);
    return _snapshot;
  }

  @override
  Future<void> dispose() async {
    _snapshot = _snapshot.copyWith(phase: CameraCapturePhase.disposed);
    await _states.close();
  }
}

final class _FakeInferenceEngine implements FishInferenceEngine {
  @override
  FishInferenceAvailability get availability => FishInferenceAvailability.ready;

  @override
  bool get isBusy => false;

  @override
  bool get isSupported => true;

  @override
  Object? get lastError => null;

  @override
  Future<void> initialize() async {}

  @override
  Future<FishInferenceResult?> analyze({
    required image.Image detectionRegion,
    required image.Image fullFrame,
    NormalizedImageRegion detectionRegionInFullFrame =
        NormalizedImageRegion.full,
    FishInferenceThresholds? thresholds,
  }) async => null;

  @override
  Future<void> dispose() async {}
}

final class _FakeLiveGateway implements OceanEyesLiveGateway {
  final List<OceanEyesLiveRole> connectRoles = [];
  final Completer<void> _disposed = Completer<void>();
  final StreamController<OceanEyesLiveSnapshot> _snapshots =
      StreamController<OceanEyesLiveSnapshot>.broadcast(sync: true);
  Object? connectError;
  int disconnectCalls = 0;
  int disposeCalls = 0;
  var _state = OceanEyesLiveConnectionState.disconnected;

  Future<void> get disposed => _disposed.future;

  @override
  OceanEyesLiveSnapshot get current => OceanEyesLiveSnapshot(state: _state);

  @override
  bool get isConnected => _state == OceanEyesLiveConnectionState.connected;

  @override
  Stream<OceanEyesLiveSnapshot> get snapshots => _snapshots.stream;

  void emit(OceanEyesLiveConnectionState state, {Object? error}) {
    _state = state;
    _snapshots.add(OceanEyesLiveSnapshot(state: state, error: error));
  }

  @override
  Future<void> connect(
    String tankId, {
    required OceanEyesLiveRole role,
    bool useFrontCamera = false,
  }) async {
    connectRoles.add(role);
    final error = connectError;
    if (error != null) throw error;
    _state = OceanEyesLiveConnectionState.connected;
  }

  @override
  Future<void> disconnect() async {
    disconnectCalls += 1;
    _state = OceanEyesLiveConnectionState.disconnected;
  }

  @override
  Future<void> dispose() async {
    disposeCalls += 1;
    _state = OceanEyesLiveConnectionState.disconnected;
    await _snapshots.close();
    if (!_disposed.isCompleted) _disposed.complete();
  }
}
