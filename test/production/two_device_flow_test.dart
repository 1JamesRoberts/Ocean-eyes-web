import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/camera/camera_capture_models.dart';
import 'package:oceaneyes/integrations/livekit/livekit_gateway.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/models/demo_fixtures.dart';
import 'package:oceaneyes/models/production_auth.dart';
import 'package:oceaneyes/models/production_data.dart';
import 'package:oceaneyes/models/production_repository.dart';
import 'package:oceaneyes/models/tank_pairing_codec.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

void main() {
  test('Phone A links Google and creates a tank, while Phone B pairs, views, '
      'and synchronizes shared state', () async {
    final backend = _SharedProductionBackend();
    final authA = _DeviceAuth('phone-a');
    final authB = _DeviceAuth('phone-b');
    final liveHub = _SharedLiveHub();
    final repositoryA = backend.repositoryFor('phone-a');
    final repositoryB = backend.repositoryFor('phone-b');
    final monitorLive = _SharedLiveGateway(liveHub, 'phone-a');
    final viewerLive = _SharedLiveGateway(liveHub, 'phone-b');
    final monitor = _controller(repositoryA, authA, live: monitorLive);
    final viewer = _controller(repositoryB, authB, live: viewerLive);

    try {
      await Future.wait([
        monitor.initializeProduction(),
        viewer.initializeProduction(),
      ]);
      await _drainMicrotasks();

      await monitor.linkGoogleAccount();
      expect(authA.googleLinkCalls, 1);
      expect(monitor.hasLinkedGoogleAccount, isTrue);
      expect(monitor.productionUser?.uid, 'phone-a');

      final tankId = await monitor.createProductionTank('Office Reef');
      expect(tankId, isNotNull);
      await _waitUntil(() => monitor.activeTankId == tankId);
      expect(
        backend.tank(tankId!)?.roleFor('phone-a'),
        ProductionTankMemberRole.owner,
      );

      final pairingCode = TankPairingCodec.encode(
        TankPairingPayload(tankId: tankId),
      );
      expect(await viewer.pairTankPayload(pairingCode), isTrue);
      await _waitUntil(
        () =>
            viewer.activeTankId == tankId &&
            backend.tank(tankId)?.roleFor('phone-b') ==
                ProductionTankMemberRole.viewer,
      );
      expect(viewer.canEditTankSettings, isFalse);
      expect(viewer.canCalibrateTank, isFalse);

      // Phone B creates a request; the monitor's real request-lease path
      // observes it and starts the monitor publisher.
      await viewer.startViewerLiveStream();
      await _waitUntil(
        () =>
            monitorLive.connectRoles.contains(OceanEyesLiveRole.monitor) &&
            backend.liveState(tankId)?.isLive == true &&
            viewer.remoteVideoTrack != null,
      );
      expect(viewerLive.connectRoles, [OceanEyesLiveRole.viewer]);
      expect(monitorLive.connectRoles, [OceanEyesLiveRole.monitor]);
      expect(monitor.liveState?.isLive, isTrue);
      expect(viewer.liveState?.isLive, isTrue);
      expect(viewer.isLiveConnected, isTrue);

      final readingTime = DateTime.now();
      await repositoryA.writeReading(
        ProductionReadingDraft(
          tankId: tankId,
          clarityScore: 8.4,
          turbidityFnu: 3.2,
          fishCount: 6,
          fishCountConfidence: 0.92,
          speciesDetected: const {'cardinal_tetra': 6},
        ),
      );
      await _waitUntil(
        () => monitor.history.length == 1 && viewer.history.length == 1,
      );
      expect(monitor.lastTurbidityResult, '3.2 FNU');
      expect(viewer.lastTurbidityResult, '3.2 FNU');
      expect(monitor.history.single.fishCount, 6);
      expect(viewer.history.single.fishCount, 6);
      expect(
        monitor.history.single.date.isAfter(
          readingTime.subtract(const Duration(seconds: 2)),
        ),
        isTrue,
      );

      // Fish inventory is a member-readable/member-writable shared stream:
      // viewer -> monitor and monitor -> viewer are both observed.
      final species = DemoFixtures.species.firstWhere(
        (option) => option.id == 'cardinal_tetra',
      );
      viewer.addSpecies(species);
      await viewer.flushPersistence();
      await _waitUntil(
        () =>
            monitor.fish.length == 1 &&
            viewer.fish.length == 1 &&
            monitor.fish.single.count == 1,
      );
      final fishId = monitor.fish.single.id;
      monitor.adjustFishCount(fishId, 2);
      await monitor.flushPersistence();
      await _waitUntil(
        () => viewer.fish.single.id == fishId && viewer.fish.single.count == 3,
      );
      expect(monitor.fish.single.count, 3);

      // Alerts are server-created, then a member resolution propagates to
      // both devices.
      backend.publishAlert(
        tankId,
        const ProductionAlert(
          id: 'alert-turbidity',
          tankId: 'unused-in-constructor',
          type: 'turbidity_high',
          item: AlertItem(
            id: 'alert-turbidity',
            title: 'Water clarity needs attention',
            message: 'The water is cloudy.',
            timeLabel: 'just now',
            severity: AlertSeverity.warning,
            actionPlan: 'Inspect the filter.',
          ),
        ),
      );
      await _waitUntil(
        () =>
            monitor.alerts.length == 1 &&
            viewer.alerts.length == 1 &&
            !viewer.alerts.single.resolved,
      );
      viewer.resolveAlert('alert-turbidity');
      await viewer.flushPersistence();
      await _waitUntil(
        () => monitor.alerts.single.resolved && viewer.alerts.single.resolved,
      );

      // The viewer request and the monitor's active publisher are both
      // represented in the shared live state, so each device sees the
      // opposite device's transition.
      await monitor.stopLiveStream();
      await _waitUntil(
        () =>
            backend.liveState(tankId)?.isLive == false &&
            monitor.liveState?.isLive == false &&
            viewer.liveState?.isLive == false,
      );
    } finally {
      monitor.dispose();
      viewer.dispose();
      await Future.wait([monitorLive.disposed, viewerLive.disposed]);
      await authA.close();
      await authB.close();
    }
  });
}

OceanEyesController _controller(
  ProductionOceanEyesRepository repository,
  ProductionAuthGateway auth, {
  required OceanEyesLiveGateway live,
}) => OceanEyesController(
  productionEnabled: true,
  productionRepository: repository,
  productionAuth: auth,
  liveGateway: live,
  cameraHandoffConfiguration: const CameraHandoffConfiguration.none(),
  launchUri: Uri.parse('https://oceaneyes.test/'),
);

Future<void> _drainMicrotasks() async {
  for (var index = 0; index < 10; index++) {
    await Future<void>.delayed(Duration.zero);
  }
}

Future<void> _waitUntil(bool Function() condition) async {
  for (var index = 0; index < 200; index++) {
    if (condition()) return;
    await Future<void>.delayed(Duration.zero);
  }
  fail('Timed out waiting for the shared two-device state transition.');
}

final class _DeviceAuth implements ProductionAuthGateway {
  _DeviceAuth(String uid)
    : _user = ProductionAuthUser(uid: uid, isAnonymous: true),
      _states = StreamController<ProductionAuthUser?>.broadcast(sync: true);

  ProductionAuthUser _user;
  final StreamController<ProductionAuthUser?> _states;
  int googleLinkCalls = 0;

  @override
  ProductionAuthUser get currentUser => _user;

  @override
  bool get hasLinkedAccount => !_user.isAnonymous;

  @override
  Stream<ProductionAuthUser?> authStateChanges() => _states.stream;

  @override
  Future<ProductionAuthUser> ensureAnonymousSession() async => _user;

  @override
  Future<GoogleAccountLinkResult> linkGoogleAccount({String? fcmToken}) async {
    googleLinkCalls += 1;
    _user = ProductionAuthUser(
      uid: _user.uid,
      isAnonymous: false,
      displayName: 'Phone A Google user',
      providerIds: const ['google.com'],
    );
    _states.add(_user);
    return GoogleAccountLinkResult(
      status: GoogleAccountLinkStatus.linkedAnonymousAccount,
      user: _user,
    );
  }

  @override
  Future<ProductionAuthUser> signOutToAnonymous({String? fcmToken}) async {
    _user = ProductionAuthUser(uid: _user.uid, isAnonymous: true);
    _states.add(_user);
    return _user;
  }

  Future<void> close() => _states.close();
}

final class _Signal<T> {
  _Signal(this._value);

  T _value;
  final Set<StreamController<T>> _listeners = <StreamController<T>>{};

  Stream<T> get stream {
    late StreamController<T> controller;
    controller = StreamController<T>.broadcast(
      sync: true,
      onListen: () {
        _listeners.add(controller);
        controller.add(_value);
      },
      onCancel: () => _listeners.remove(controller),
    );
    return controller.stream;
  }

  void emit(T value) {
    _value = value;
    for (final listener in List<StreamController<T>>.of(_listeners)) {
      if (!listener.isClosed) listener.add(value);
    }
  }
}

final class _SharedProductionBackend {
  final Map<String, _SharedTank> _tanks = <String, _SharedTank>{};
  final Map<String, Set<String>> _userTankIds = <String, Set<String>>{};
  final Map<String, _Signal<List<String>>> _userSignals =
      <String, _Signal<List<String>>>{};
  var _tankSequence = 0;
  var _readingSequence = 0;

  _SharedProductionRepository repositoryFor(String uid) =>
      _SharedProductionRepository(this, uid);

  ProductionTank? tank(String tankId) => _tanks[tankId]?.tankValue;

  ProductionLiveState? liveState(String tankId) =>
      _tanks[tankId]?.liveStateValue;

  _Signal<List<String>> _userSignal(String uid) => _userSignals.putIfAbsent(
    uid,
    () => _Signal<List<String>>(_sortedUserTankIds(uid)),
  );

  List<String> _sortedUserTankIds(String uid) {
    final ids = _userTankIds[uid]?.toList() ?? <String>[];
    ids.sort();
    return List.unmodifiable(ids);
  }

  void _addUserTank(String uid, String tankId) {
    final ids = _userTankIds.putIfAbsent(uid, () => <String>{});
    if (ids.add(tankId)) _userSignal(uid).emit(_sortedUserTankIds(uid));
  }

  String createTank(String ownerId, String name) {
    final tankId = 'tank-${_tankSequence += 1}';
    final tank = ProductionTank(
      id: tankId,
      name: name,
      ownerId: ownerId,
      monitorIds: [ownerId],
      viewerIds: const [],
      thresholds: ProductionTankThresholds.defaults,
      recalibrationRequested: false,
      createdAt: DateTime.now(),
      waterLineY: 0.42,
    );
    final shared = _SharedTank(tank);
    _tanks[tankId] = shared;
    _addUserTank(ownerId, tankId);
    return tankId;
  }

  bool joinTank(String uid, String tankId) {
    final shared = _tanks[tankId];
    if (shared == null) return false;
    if (shared.tankValue.roleFor(uid) == ProductionTankMemberRole.none) {
      shared.tankValue = _copyTank(
        shared.tankValue,
        viewerIds: [...shared.tankValue.viewerIds, uid],
      );
      shared.tankSignal.emit(shared.tankValue);
    }
    _addUserTank(uid, tankId);
    return true;
  }

  void publishAlert(String tankId, ProductionAlert alert) {
    final shared = _tanks[tankId]!;
    final alerts = [
      ...shared.alertsValue.where((entry) => entry.id != alert.id),
      alert,
    ];
    alerts.sort((left, right) => left.id.compareTo(right.id));
    shared.alertsValue = List.unmodifiable(alerts);
    shared.alertsSignal.emit(shared.alertsValue);
  }

  void _emitLive(_SharedTank shared) {
    final requests = shared.requestsValue.values.toList()
      ..sort((left, right) => left.userId.compareTo(right.userId));
    shared.requestsSignal.emit(List.unmodifiable(requests));
    final current = shared.liveStateValue;
    shared.liveStateValue = ProductionLiveState(
      tankId: current.tankId,
      isLive: current.isLive,
      requested: requests.isNotEmpty,
      requesterId: requests.isEmpty ? '' : requests.first.userId,
      streamUrl: current.streamUrl,
      currentFishCount: shared.fishValue.fold(
        0,
        (sum, entry) => sum + entry.count,
      ),
      startedAt: current.startedAt,
      lastPingAt: current.lastPingAt,
      requestedAt: requests.isEmpty ? null : requests.first.requestedAt,
      currentClarityScore: current.currentClarityScore,
      currentTurbidityFnu: current.currentTurbidityFnu,
    );
    shared.liveStateSignal.emit(shared.liveStateValue);
  }

  static ProductionTank _copyTank(
    ProductionTank tank, {
    List<String>? viewerIds,
    String? name,
    ProductionTankThresholds? thresholds,
    double? waterLineY,
    bool? recalibrationRequested,
  }) => ProductionTank(
    id: tank.id,
    name: name ?? tank.name,
    ownerId: tank.ownerId,
    monitorIds: tank.monitorIds,
    viewerIds: viewerIds ?? tank.viewerIds,
    thresholds: thresholds ?? tank.thresholds,
    recalibrationRequested:
        recalibrationRequested ?? tank.recalibrationRequested,
    createdAt: tank.createdAt,
    waterLineY: waterLineY ?? tank.waterLineY,
  );

  ProductionReadingBundle _readingBundle(_SharedTank shared) {
    final newestFirst = List<ProductionReading>.of(shared.readingsValue)
      ..sort((left, right) {
        final leftTime =
            left.timestamp ?? DateTime.fromMillisecondsSinceEpoch(0);
        final rightTime =
            right.timestamp ?? DateTime.fromMillisecondsSinceEpoch(0);
        return rightTime.compareTo(leftTime);
      });
    final history = newestFirst
        .where((reading) => reading.isHistoryReading)
        .map(
          (reading) => HistoryReading(
            date: reading.timestamp!,
            clarity: reading.clarityScore!,
            fishCount: reading.fishCount,
            summary: 'Shared production reading.',
            ph: reading.ph,
            temp: reading.temperatureCelsius,
          ),
        )
        .toList(growable: false);
    final chronological = history.reversed.toList(growable: false);
    final points = chronological
        .map(
          (reading) => ProductionAnalyticsPoint(
            timestamp: reading.date,
            label: reading.date.toIso8601String(),
            clarityPercent: reading.clarity * 10,
            fishCount: reading.fishCount,
            speciesDetected: const {},
          ),
        )
        .toList(growable: false);
    return ProductionReadingBundle(
      readings: List.unmodifiable(newestFirst),
      history: List.unmodifiable(history),
      analytics: ProductionAnalyticsData(
        points: points,
        claritySeries: points
            .map((point) => ChartPoint(point.label, point.clarityPercent))
            .toList(growable: false),
        fishCountSeries: points
            .map((point) => ChartPoint(point.label, point.fishCount.toDouble()))
            .toList(growable: false),
        speciesSeries: const {},
        heatmapCenters: const [],
      ),
    );
  }

  void writeReading(String uid, ProductionReadingDraft draft) {
    final shared = _tanks[draft.tankId]!;
    final timestamp = DateTime.now();
    final reading = ProductionReading(
      id: 'reading-${_readingSequence += 1}',
      tankId: draft.tankId,
      timestamp: timestamp,
      clarityScore: draft.clarityScore,
      turbidityFnu: draft.turbidityFnu,
      fishCount: draft.fishCount,
      fishCountConfidence: draft.fishCountConfidence,
      speciesDetected: draft.speciesDetected,
      frameUrl: draft.frameUrl,
      ph: draft.ph,
      temperatureCelsius: draft.temperatureCelsius,
      ammoniaPpm: draft.ammoniaPpm,
      nitritePpm: draft.nitritePpm,
      detections: draft.detections,
      frameDimensions: draft.frameDimensions,
    );
    shared.readingsValue = [reading, ...shared.readingsValue];
    shared.readingsSignal.emit(_readingBundle(shared));
    final current = shared.liveStateValue;
    shared.liveStateValue = ProductionLiveState(
      tankId: current.tankId,
      isLive: current.isLive,
      requested: current.requested,
      requesterId: current.requesterId,
      streamUrl: current.streamUrl,
      currentFishCount: draft.fishCount,
      startedAt: current.startedAt,
      lastPingAt: current.lastPingAt,
      requestedAt: current.requestedAt,
      currentClarityScore: draft.clarityScore,
      currentTurbidityFnu: draft.turbidityFnu,
    );
    shared.liveStateSignal.emit(shared.liveStateValue);
  }
}

final class _SharedTank {
  _SharedTank(ProductionTank tank)
    : tankValue = tank,
      tankSignal = _Signal<ProductionTank?>(tank),
      readingsSignal = _Signal<ProductionReadingBundle>(
        ProductionReadingBundle.empty,
      ),
      fishSignal = _Signal<List<FishEntry>>(const []),
      alertsSignal = _Signal<List<ProductionAlert>>(const []),
      liveStateValue = ProductionLiveState(
        tankId: tank.id,
        isLive: false,
        requested: false,
        requesterId: '',
        streamUrl: 'livekit://${tank.id}',
        currentFishCount: 0,
      ),
      liveStateSignal = _Signal<ProductionLiveState?>(null),
      requestsSignal = _Signal<List<ProductionLiveRequest>>(const []) {
    liveStateSignal.emit(liveStateValue);
  }

  ProductionTank tankValue;
  final _Signal<ProductionTank?> tankSignal;
  List<ProductionReading> readingsValue = const [];
  final _Signal<ProductionReadingBundle> readingsSignal;
  List<FishEntry> fishValue = const [];
  final _Signal<List<FishEntry>> fishSignal;
  List<ProductionAlert> alertsValue = const [];
  final _Signal<List<ProductionAlert>> alertsSignal;
  ProductionLiveState liveStateValue;
  final _Signal<ProductionLiveState?> liveStateSignal;
  final Map<String, ProductionLiveRequest> requestsValue =
      <String, ProductionLiveRequest>{};
  final _Signal<List<ProductionLiveRequest>> requestsSignal;
}

final class _SharedProductionRepository
    implements ProductionOceanEyesRepository {
  _SharedProductionRepository(this._backend, this._uid);

  final _SharedProductionBackend _backend;
  final String _uid;

  _SharedTank _tank(String tankId) => _backend._tanks[tankId]!;

  @override
  String? get currentUserId => _uid;

  @override
  Stream<ProductionTank?> watchTank(String tankId) =>
      _tank(tankId).tankSignal.stream;

  @override
  Stream<List<ProductionReading>> watchReadings(
    String tankId, {
    int limit = 120,
  }) =>
      watchReadingBundle(tankId, limit: limit).map((bundle) => bundle.readings);

  @override
  Stream<ProductionReadingBundle> watchReadingBundle(
    String tankId, {
    int limit = 120,
  }) => _tank(tankId).readingsSignal.stream;

  @override
  Stream<List<HistoryReading>> watchHistory(String tankId, {int limit = 120}) =>
      watchReadingBundle(tankId, limit: limit).map((bundle) => bundle.history);

  @override
  Stream<ProductionAnalyticsData> watchAnalytics(
    String tankId, {
    int limit = 120,
  }) => watchReadingBundle(
    tankId,
    limit: limit,
  ).map((bundle) => bundle.analytics);

  @override
  Stream<List<FishEntry>> watchFishInventory(String tankId) =>
      _tank(tankId).fishSignal.stream;

  @override
  Stream<List<ProductionAlert>> watchAlerts(String tankId, {int limit = 40}) =>
      _tank(tankId).alertsSignal.stream;

  @override
  Stream<ProductionUser?> watchCurrentUser() => _backend
      ._userSignal(_uid)
      .stream
      .map(
        (tankIds) =>
            ProductionUser(id: _uid, tankIds: tankIds, fcmTokens: const []),
      );

  @override
  Stream<List<String>> watchLinkedTankIds() =>
      _backend._userSignal(_uid).stream;

  @override
  Stream<ProductionLiveState?> watchLiveState(String tankId) =>
      _tank(tankId).liveStateSignal.stream;

  @override
  Stream<List<ProductionLiveRequest>> watchLiveRequests(String tankId) =>
      _tank(tankId).requestsSignal.stream;

  @override
  Future<ProductionTank?> getTank(String tankId) async => _backend.tank(tankId);

  @override
  Future<String> createTank(String name) async =>
      _backend.createTank(_uid, name);

  @override
  Future<bool> joinTank(String tankId) async => _backend.joinTank(_uid, tankId);

  @override
  Future<void> unlinkTank(String tankId) async {
    final shared = _backend._tanks[tankId];
    if (shared == null) return;
    shared.tankValue = _SharedProductionBackend._copyTank(
      shared.tankValue,
      viewerIds: shared.tankValue.viewerIds.where((id) => id != _uid).toList(),
    );
    shared.tankSignal.emit(shared.tankValue);
    final ids = _backend._userTankIds[_uid];
    if (ids?.remove(tankId) ?? false) {
      _backend._userSignal(_uid).emit(_backend._sortedUserTankIds(_uid));
    }
  }

  @override
  Future<void> deleteTank(String tankId) async {}

  @override
  Future<void> updateTankName(String tankId, String name) async {
    final shared = _tank(tankId);
    shared.tankValue = _SharedProductionBackend._copyTank(
      shared.tankValue,
      name: name,
    );
    shared.tankSignal.emit(shared.tankValue);
  }

  @override
  Future<void> updateThresholds(
    String tankId,
    ProductionTankThresholds thresholds,
  ) async {
    final shared = _tank(tankId);
    shared.tankValue = _SharedProductionBackend._copyTank(
      shared.tankValue,
      thresholds: thresholds,
    );
    shared.tankSignal.emit(shared.tankValue);
  }

  @override
  Future<void> updateCalibration(String tankId, double waterLineY) async {
    final shared = _tank(tankId);
    shared.tankValue = _SharedProductionBackend._copyTank(
      shared.tankValue,
      waterLineY: waterLineY,
    );
    shared.tankSignal.emit(shared.tankValue);
  }

  @override
  Future<void> requestRecalibration(String tankId, bool requested) async {
    final shared = _tank(tankId);
    shared.tankValue = _SharedProductionBackend._copyTank(
      shared.tankValue,
      recalibrationRequested: requested,
    );
    shared.tankSignal.emit(shared.tankValue);
  }

  @override
  Future<void> writeReading(ProductionReadingDraft reading) async =>
      _backend.writeReading(_uid, reading);

  @override
  Future<void> evaluateAlerts(String tankId) async {}

  @override
  Future<void> resolveAlert(String alertId) async {
    for (final shared in _backend._tanks.values) {
      if (!shared.alertsValue.any((alert) => alert.id == alertId)) continue;
      shared.alertsValue = shared.alertsValue
          .map(
            (alert) => alert.id == alertId
                ? ProductionAlert(
                    id: alert.id,
                    tankId: alert.tankId,
                    type: alert.type,
                    item: alert.item.copyWith(resolved: true),
                    timestamp: alert.timestamp,
                    snoozedUntil: alert.snoozedUntil,
                  )
                : alert,
          )
          .toList(growable: false);
      shared.alertsSignal.emit(shared.alertsValue);
      return;
    }
  }

  @override
  Future<void> snoozeAlert(String alertId, Duration duration) async {}

  @override
  Future<void> addFish(ProductionFishDraft fish) async {
    final shared = _tank(fish.tankId);
    final existing = shared.fishValue.indexWhere(
      (entry) => entry.speciesId == fish.speciesId,
    );
    if (existing >= 0) {
      final entry = shared.fishValue[existing];
      shared.fishValue = [
        ...shared.fishValue.take(existing),
        entry.copyWith(count: (entry.count + fish.count).clamp(1, 99)),
        ...shared.fishValue.skip(existing + 1),
      ];
    } else {
      shared.fishValue = [
        ...shared.fishValue,
        FishEntry(
          id: 'fish-${fish.speciesId}',
          speciesId: fish.speciesId,
          name: fish.name,
          scientificName: 'Shared test species',
          assetPath: 'assets/images/fish/${fish.speciesId}.png',
          count: fish.count.clamp(1, 99),
          detected: 0,
          compatibility: 'Community',
          careLevel: 'Easy',
        ),
      ];
    }
    shared.fishValue = List.unmodifiable(shared.fishValue);
    shared.fishSignal.emit(shared.fishValue);
    _backend._emitLive(shared);
  }

  @override
  Future<void> updateFishCount(String fishId, int count) async {
    for (final shared in _backend._tanks.values) {
      final index = shared.fishValue.indexWhere((entry) => entry.id == fishId);
      if (index < 0) continue;
      final entry = shared.fishValue[index];
      shared.fishValue = [
        ...shared.fishValue.take(index),
        entry.copyWith(count: count.clamp(1, 99)),
        ...shared.fishValue.skip(index + 1),
      ];
      shared.fishValue = List.unmodifiable(shared.fishValue);
      shared.fishSignal.emit(shared.fishValue);
      _backend._emitLive(shared);
      return;
    }
  }

  @override
  Future<void> updateDetectedFish(String fishId, int detected) async {}

  @override
  Future<void> removeFish(String fishId) async {}

  @override
  Future<void> saveFcmToken(String token) async {}

  @override
  Future<void> removeFcmToken(String token) async {}

  @override
  Future<List<String>> linkedTankIdsForUser(String userId) async =>
      _backend._sortedUserTankIds(userId);

  @override
  Future<void> requestLive(String tankId) async {
    final shared = _tank(tankId);
    shared.requestsValue[_uid] = ProductionLiveRequest(
      userId: _uid,
      requestedAt: DateTime.now(),
    );
    _backend._emitLive(shared);
  }

  @override
  Future<void> clearLiveRequest(String tankId) async {
    final shared = _tank(tankId);
    shared.requestsValue.remove(_uid);
    _backend._emitLive(shared);
  }

  @override
  Future<void> setLiveActive(String tankId, bool active) async {
    final shared = _tank(tankId);
    final current = shared.liveStateValue;
    shared.liveStateValue = ProductionLiveState(
      tankId: tankId,
      isLive: active,
      requested: current.requested,
      requesterId: current.requesterId,
      streamUrl: current.streamUrl,
      currentFishCount: current.currentFishCount,
      startedAt: active ? DateTime.now() : null,
      lastPingAt: DateTime.now(),
      requestedAt: current.requestedAt,
      currentClarityScore: current.currentClarityScore,
      currentTurbidityFnu: current.currentTurbidityFnu,
    );
    shared.liveStateSignal.emit(shared.liveStateValue);
  }

  @override
  Future<void> pingLive(String tankId) async {
    final shared = _tank(tankId);
    final current = shared.liveStateValue;
    shared.liveStateValue = ProductionLiveState(
      tankId: current.tankId,
      isLive: current.isLive,
      requested: current.requested,
      requesterId: current.requesterId,
      streamUrl: current.streamUrl,
      currentFishCount: current.currentFishCount,
      startedAt: current.startedAt,
      lastPingAt: DateTime.now(),
      requestedAt: current.requestedAt,
      currentClarityScore: current.currentClarityScore,
      currentTurbidityFnu: current.currentTurbidityFnu,
    );
    shared.liveStateSignal.emit(shared.liveStateValue);
  }
}

final class _SharedLiveHub {
  final Set<_SharedLiveGateway> _gateways = <_SharedLiveGateway>{};

  void connect(_SharedLiveGateway gateway) {
    _gateways.add(gateway);
    gateway.emit(OceanEyesLiveConnectionState.connected);
    if (gateway.role == OceanEyesLiveRole.viewer && _hasMonitor) {
      gateway.emit(
        OceanEyesLiveConnectionState.connected,
        remoteVideoTrack: 'camera-track:phone-a',
      );
    }
    if (gateway.role == OceanEyesLiveRole.monitor) {
      for (final other in _gateways) {
        if (other.role == OceanEyesLiveRole.viewer) {
          other.emit(
            OceanEyesLiveConnectionState.connected,
            remoteVideoTrack: 'camera-track:phone-a',
          );
        }
      }
    }
  }

  void disconnect(_SharedLiveGateway gateway) {
    _gateways.remove(gateway);
    gateway.emit(OceanEyesLiveConnectionState.disconnected);
    if (gateway.role == OceanEyesLiveRole.monitor && !_hasMonitor) {
      for (final other in _gateways) {
        if (other.role == OceanEyesLiveRole.viewer) {
          other.emit(OceanEyesLiveConnectionState.disconnected);
        }
      }
    }
  }

  bool get _hasMonitor =>
      _gateways.any((gateway) => gateway.role == OceanEyesLiveRole.monitor);
}

final class _SharedLiveGateway implements OceanEyesLiveGateway {
  _SharedLiveGateway(this._hub, this.deviceId)
    : _snapshots = StreamController<OceanEyesLiveSnapshot>.broadcast(
        sync: true,
      );

  final _SharedLiveHub _hub;
  final String deviceId;
  final StreamController<OceanEyesLiveSnapshot> _snapshots;
  final List<OceanEyesLiveRole> connectRoles = <OceanEyesLiveRole>[];
  final Completer<void> _disposedCompleter = Completer<void>();
  OceanEyesLiveRole? role;
  OceanEyesLiveSnapshot _current = const OceanEyesLiveSnapshot(
    state: OceanEyesLiveConnectionState.disconnected,
  );

  Future<void> get disposed => _disposedCompleter.future;

  @override
  Stream<OceanEyesLiveSnapshot> get snapshots => _snapshots.stream;

  @override
  OceanEyesLiveSnapshot get current => _current;

  @override
  bool get isConnected =>
      _current.state == OceanEyesLiveConnectionState.connected;

  @override
  Future<void> connect(
    String tankId, {
    required OceanEyesLiveRole role,
    bool useFrontCamera = false,
  }) async {
    connectRoles.add(role);
    this.role = role;
    _hub.connect(this);
  }

  @override
  Future<void> disconnect() async => _hub.disconnect(this);

  void emit(
    OceanEyesLiveConnectionState state, {
    Object? remoteVideoTrack,
    Object? error,
  }) {
    _current = OceanEyesLiveSnapshot(
      state: state,
      remoteVideoTrack: remoteVideoTrack ?? _current.remoteVideoTrack,
      error: error,
    );
    if (!_snapshots.isClosed) _snapshots.add(_current);
  }

  @override
  Future<void> dispose() async {
    _hub._gateways.remove(this);
    if (!_snapshots.isClosed) await _snapshots.close();
    if (!_disposedCompleter.isCompleted) _disposedCompleter.complete();
  }
}
