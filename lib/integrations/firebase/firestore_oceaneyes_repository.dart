import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../models/aquarium_models.dart';
import '../../models/production_data.dart';
import '../../models/production_repository.dart';
import '../../models/tank_pairing_codec.dart';
import 'firestore_schema_mapper.dart';

class FirestoreOceanEyesRepository implements ProductionOceanEyesRepository {
  static const int maxFcmTokensPerUser = 10;

  FirestoreOceanEyesRepository({
    FirebaseFirestore? firestore,
    FirebaseFunctions? functions,
    String? Function()? currentUserId,
    FirestoreSchemaMapper? mapper,
    DateTime Function()? clock,
  }) : _db = firestore ?? FirebaseFirestore.instance,
       _functions = functions,
       _currentUserId =
           currentUserId ?? (() => FirebaseAuth.instance.currentUser?.uid),
       _mapper = mapper ?? FirestoreSchemaMapper(clock: clock),
       _clock = clock ?? DateTime.now;

  final FirebaseFirestore _db;
  FirebaseFunctions? _functions;
  final String? Function() _currentUserId;
  final FirestoreSchemaMapper _mapper;
  final DateTime Function() _clock;

  FirebaseFunctions get _cloudFunctions =>
      _functions ??= FirebaseFunctions.instance;

  @override
  String? get currentUserId => _currentUserId();

  @override
  Stream<ProductionTank?> watchTank(String tankId) {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    return _db.collection('tanks').doc(normalizedId).snapshots().map((
      snapshot,
    ) {
      final data = snapshot.data();
      return snapshot.exists && data != null
          ? _mapper.tankFromDocument(
              FirestoreDocumentData(id: snapshot.id, data: data),
            )
          : null;
    });
  }

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
  }) {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    final normalizedLimit = limit.clamp(1, 500);
    return _db
        .collection('readings')
        .where('tank_id', isEqualTo: normalizedId)
        .orderBy('timestamp', descending: true)
        .limit(normalizedLimit)
        .snapshots()
        .map(
          (snapshot) => _mapper.readingBundleFromDocuments(
            _documents(snapshot),
            limit: normalizedLimit,
          ),
        );
  }

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
  Stream<List<FishEntry>> watchFishInventory(String tankId) {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    return _db
        .collection('tank_fish')
        .where('tank_id', isEqualTo: normalizedId)
        .snapshots()
        .map(
          (snapshot) =>
              _mapper.fishInventoryFromDocuments(_documents(snapshot)),
        );
  }

  @override
  Stream<List<ProductionAlert>> watchAlerts(String tankId, {int limit = 40}) {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    final normalizedLimit = limit.clamp(1, 200);
    return _db
        .collection('alerts')
        .where('tank_id', isEqualTo: normalizedId)
        .orderBy('timestamp', descending: true)
        .limit(normalizedLimit)
        .snapshots()
        .map(
          (snapshot) => _mapper.alertsFromDocuments(
            _documents(snapshot),
            limit: normalizedLimit,
          ),
        );
  }

  @override
  Stream<ProductionUser?> watchCurrentUser() {
    final uid = _requireUserId();
    return _db.collection('users').doc(uid).snapshots().map((snapshot) {
      final data = snapshot.data();
      return snapshot.exists && data != null
          ? _mapper.userFromDocument(
              FirestoreDocumentData(id: snapshot.id, data: data),
            )
          : null;
    });
  }

  @override
  Stream<List<String>> watchLinkedTankIds() =>
      watchCurrentUser().map((user) => user?.tankIds ?? const <String>[]);

  @override
  Stream<ProductionLiveState?> watchLiveState(String tankId) {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    return _db.collection('live_state').doc(normalizedId).snapshots().map((
      snapshot,
    ) {
      final data = snapshot.data();
      return snapshot.exists && data != null
          ? _mapper.liveStateFromDocument(
              FirestoreDocumentData(id: snapshot.id, data: data),
            )
          : null;
    });
  }

  @override
  Stream<List<ProductionLiveRequest>> watchLiveRequests(String tankId) {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    return _db
        .collection('live_state')
        .doc(normalizedId)
        .collection('requests')
        .snapshots()
        .map(
          (snapshot) => _mapper.liveRequestsFromDocuments(_documents(snapshot)),
        );
  }

  @override
  Future<ProductionTank?> getTank(String tankId) async {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    final snapshot = await _db.collection('tanks').doc(normalizedId).get();
    final data = snapshot.data();
    return snapshot.exists && data != null
        ? _mapper.tankFromDocument(
            FirestoreDocumentData(id: snapshot.id, data: data),
          )
        : null;
  }

  @override
  Future<String> createTank(String name) async {
    final uid = _requireUserId();
    final normalizedName = name.trim();
    if (normalizedName.isEmpty) {
      throw ArgumentError.value(name, 'name', 'Tank name must not be empty.');
    }

    final tank = _db.collection('tanks').doc();
    final reading = _db.collection('readings').doc();
    final liveState = _db.collection('live_state').doc(tank.id);
    final user = _db.collection('users').doc(uid);
    final timestamp = FieldValue.serverTimestamp();
    final batch = _db.batch();
    batch.set(
      tank,
      _mapper.tankCreateData(
        name: normalizedName,
        ownerId: uid,
        serverTimestamp: timestamp,
      ),
    );
    batch.set(
      reading,
      _mapper.initialReadingData(tankId: tank.id, serverTimestamp: timestamp),
    );
    batch.set(
      liveState,
      _mapper.initialLiveStateData(
        publisherId: uid,
        serverTimestamp: timestamp,
      ),
    );
    batch.set(user, <String, Object?>{
      'tanks': FieldValue.arrayUnion(<String>[tank.id]),
      'created_at': timestamp,
      'updated_at': timestamp,
    }, SetOptions(merge: true));
    await batch.commit();
    return tank.id;
  }

  @override
  Future<bool> joinTank(String tankId) async {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    final uid = _requireUserId();
    final tank = _db.collection('tanks').doc(normalizedId);
    final user = _db.collection('users').doc(uid);
    return _db.runTransaction<bool>((transaction) async {
      final snapshot = await transaction.get(tank);
      final data = snapshot.data();
      if (!snapshot.exists || data == null) return false;
      final alreadyMember =
          data['owner_id'] == uid ||
          _containsString(data['monitor_uids'], uid) ||
          _containsString(data['viewers'], uid);
      if (!alreadyMember) {
        transaction.update(tank, <String, Object?>{
          'viewers': FieldValue.arrayUnion(<String>[uid]),
        });
      }
      transaction.set(user, <String, Object?>{
        'tanks': FieldValue.arrayUnion(<String>[normalizedId]),
        'updated_at': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      return true;
    });
  }

  @override
  Future<void> unlinkTank(String tankId) async {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    final uid = _requireUserId();
    final tank = _db.collection('tanks').doc(normalizedId);
    final user = _db.collection('users').doc(uid);
    await _db.runTransaction<void>((transaction) async {
      final snapshot = await transaction.get(tank);
      final data = snapshot.data();
      if (snapshot.exists &&
          data != null &&
          _containsString(data['viewers'], uid)) {
        transaction.update(tank, <String, Object?>{
          'viewers': FieldValue.arrayRemove(<String>[uid]),
        });
      }
      transaction.set(user, <String, Object?>{
        'tanks': FieldValue.arrayRemove(<String>[normalizedId]),
        'updated_at': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    });
  }

  @override
  Future<void> deleteTank(String tankId) async {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    await _cloudFunctions.httpsCallable('deleteTank').call<void>(
      <String, Object>{'tankId': normalizedId},
    );
  }

  @override
  Future<void> updateTankName(String tankId, String name) {
    final normalizedName = name.trim();
    if (normalizedName.isEmpty) {
      throw ArgumentError.value(name, 'name', 'Tank name must not be empty.');
    }
    return _tankDocument(tankId).update(<String, Object?>{
      'name': normalizedName,
      'updated_at': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> updateThresholds(
    String tankId,
    ProductionTankThresholds thresholds,
  ) {
    final values = _mapper.thresholdsData(thresholds);
    return _tankDocument(tankId).update(<String, Object?>{
      for (final entry in values.entries)
        'thresholds.${entry.key}': entry.value,
      'updated_at': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> updateCalibration(String tankId, double waterLineY) =>
      _tankDocument(tankId).update(<String, Object?>{
        'calibration.water_line_y': waterLineY.clamp(0, 1),
        'updated_at': FieldValue.serverTimestamp(),
      });

  @override
  Future<void> requestRecalibration(String tankId, bool requested) =>
      _tankDocument(tankId).update(<String, Object?>{
        'recalibrate_requested': requested,
        'updated_at': FieldValue.serverTimestamp(),
      });

  @override
  Future<void> writeReading(ProductionReadingDraft reading) async {
    final data = _mapper.readingData(
      reading,
      serverTimestamp: FieldValue.serverTimestamp(),
    );
    data['tank_id'] = TankPairingCodec.normalizeTankId(reading.tankId);
    await _db.collection('readings').add(data);
  }

  @override
  Future<void> evaluateAlerts(String tankId) async {
    final normalizedId = TankPairingCodec.normalizeTankId(tankId);
    await _cloudFunctions.httpsCallable('evaluateAlertConditions').call<void>(
      <String, Object>{'tankId': normalizedId},
    );
  }

  @override
  Future<void> resolveAlert(String alertId) =>
      _db.collection('alerts').doc(alertId).update(<String, Object?>{
        'resolved': true,
        'updated_at': FieldValue.serverTimestamp(),
      });

  @override
  Future<void> snoozeAlert(String alertId, Duration duration) {
    if (duration <= Duration.zero || duration > const Duration(hours: 24)) {
      throw ArgumentError.value(
        duration,
        'duration',
        'Must be positive and no longer than 24 hours.',
      );
    }
    return _db.collection('alerts').doc(alertId).update(<String, Object?>{
      'snoozed_until': Timestamp.fromDate(_clock().add(duration)),
      'updated_at': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> addFish(ProductionFishDraft fish) async {
    final normalizedTankId = TankPairingCodec.normalizeTankId(fish.tankId);
    final data = _mapper.fishData(
      fish,
      serverTimestamp: FieldValue.serverTimestamp(),
    );
    data['tank_id'] = normalizedTankId;
    final normalizedSpeciesId = data['species_id'];
    final inventory = await _db
        .collection('tank_fish')
        .where('tank_id', isEqualTo: normalizedTankId)
        .get();
    final matching = inventory.docs.where((document) {
      final mapped = _mapper.fishFromDocument(
        FirestoreDocumentData(id: document.id, data: document.data()),
      );
      return mapped.speciesId == normalizedSpeciesId;
    }).toList()..sort((left, right) => left.id.compareTo(right.id));
    if (matching.isNotEmpty) {
      final document = matching.first.reference;
      await _db.runTransaction<void>((transaction) async {
        final snapshot = await transaction.get(document);
        final current = _number(snapshot.data()?['count'])?.round() ?? 0;
        transaction.update(document, <String, Object?>{
          'count': (current + fish.count).clamp(1, 99),
          'updated_at': FieldValue.serverTimestamp(),
        });
      });
      return;
    }
    await _db.collection('tank_fish').add(data);
  }

  @override
  Future<void> updateFishCount(String fishId, int count) async {
    final reference = _db.collection('tank_fish').doc(fishId);
    final normalizedCount = count.clamp(1, 99);
    await _db.runTransaction<void>((transaction) async {
      final snapshot = await transaction.get(reference);
      final detected = _number(snapshot.data()?['detected'])?.round() ?? 0;
      transaction.update(reference, <String, Object?>{
        'count': normalizedCount,
        'detected': detected.clamp(0, normalizedCount),
        'updated_at': FieldValue.serverTimestamp(),
      });
    });
  }

  @override
  Future<void> updateDetectedFish(String fishId, int detected) async {
    final reference = _db.collection('tank_fish').doc(fishId);
    await _db.runTransaction<void>((transaction) async {
      final snapshot = await transaction.get(reference);
      final count = (_number(snapshot.data()?['count'])?.round() ?? 1).clamp(
        1,
        99,
      );
      transaction.update(reference, <String, Object?>{
        'detected': detected.clamp(0, count),
        'updated_at': FieldValue.serverTimestamp(),
      });
    });
  }

  @override
  Future<void> removeFish(String fishId) =>
      _db.collection('tank_fish').doc(fishId).delete();

  @override
  Future<void> saveFcmToken(String token) async {
    final normalizedToken = token.trim();
    if (normalizedToken.isEmpty) return;
    final uid = _requireUserId();
    final reference = _db.collection('users').doc(uid);
    await _db.runTransaction<void>((transaction) async {
      final snapshot = await transaction.get(reference);
      final rawTokens = snapshot.data()?['fcm_tokens'];
      final tokens = <String>[];
      if (rawTokens is Iterable<Object?>) {
        for (final value in rawTokens.whereType<String>()) {
          final normalized = value.trim();
          if (normalized.isNotEmpty &&
              normalized != normalizedToken &&
              !tokens.contains(normalized)) {
            tokens.add(normalized);
          }
        }
      }
      tokens.add(normalizedToken);
      final boundedTokens = tokens.length <= maxFcmTokensPerUser
          ? tokens
          : tokens.sublist(tokens.length - maxFcmTokensPerUser);
      transaction.set(reference, <String, Object?>{
        'fcm_token': normalizedToken,
        'fcm_tokens': boundedTokens,
        'updated_at': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    });
  }

  @override
  Future<void> removeFcmToken(String token) async {
    final normalizedToken = token.trim();
    if (normalizedToken.isEmpty) return;
    final uid = _requireUserId();
    final reference = _db.collection('users').doc(uid);
    await _db.runTransaction<void>((transaction) async {
      final snapshot = await transaction.get(reference);
      final update = <String, Object?>{
        'fcm_tokens': FieldValue.arrayRemove(<String>[normalizedToken]),
        'updated_at': FieldValue.serverTimestamp(),
      };
      if (snapshot.data()?['fcm_token'] == normalizedToken) {
        update['fcm_token'] = FieldValue.delete();
      }
      transaction.set(reference, update, SetOptions(merge: true));
    });
  }

  @override
  Future<List<String>> linkedTankIdsForUser(String userId) async {
    if (userId.trim().isEmpty) return const [];
    final snapshot = await _db.collection('users').doc(userId).get();
    final data = snapshot.data();
    if (!snapshot.exists || data == null) return const [];
    return _mapper
        .userFromDocument(FirestoreDocumentData(id: snapshot.id, data: data))
        .tankIds;
  }

  @override
  Future<void> requestLive(String tankId) {
    final uid = _requireUserId();
    return _liveDocument(tankId).collection('requests').doc(uid).set(
      <String, Object?>{
        'requester_uid': uid,
        'requested_at': FieldValue.serverTimestamp(),
      },
    );
  }

  @override
  Future<void> clearLiveRequest(String tankId) {
    final uid = _requireUserId();
    return _liveDocument(tankId).collection('requests').doc(uid).delete();
  }

  @override
  Future<void> setLiveActive(String tankId, bool active) =>
      _liveDocument(tankId).set(<String, Object?>{
        'is_live': active,
        'started_at': active ? FieldValue.serverTimestamp() : null,
        'last_ping_at': FieldValue.serverTimestamp(),
        'publisher_uid': _requireUserId(),
        'updated_at': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

  @override
  Future<void> pingLive(String tankId) =>
      _liveDocument(tankId).set(<String, Object?>{
        'last_ping_at': FieldValue.serverTimestamp(),
        'publisher_uid': _requireUserId(),
        'updated_at': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

  String _requireUserId() {
    final uid = currentUserId;
    if (uid == null || uid.isEmpty) {
      throw StateError('An authenticated Firebase session is required.');
    }
    return uid;
  }

  DocumentReference<Map<String, dynamic>> _tankDocument(String tankId) =>
      _db.collection('tanks').doc(TankPairingCodec.normalizeTankId(tankId));

  DocumentReference<Map<String, dynamic>> _liveDocument(String tankId) => _db
      .collection('live_state')
      .doc(TankPairingCodec.normalizeTankId(tankId));

  Iterable<FirestoreDocumentData> _documents(
    QuerySnapshot<Map<String, dynamic>> snapshot,
  ) => snapshot.docs.map(
    (document) => FirestoreDocumentData(id: document.id, data: document.data()),
  );

  double? _number(Object? value) => switch (value) {
    num value when value.isFinite => value.toDouble(),
    String value => double.tryParse(value),
    _ => null,
  };

  bool _containsString(Object? value, String candidate) =>
      value is Iterable<Object?> &&
      value.whereType<String>().contains(candidate);
}
