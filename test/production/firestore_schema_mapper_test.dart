import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/firebase/firestore_schema_mapper.dart';
import 'package:oceaneyes/integrations/ml/onnx_fish_inference.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/models/production_data.dart';

void main() {
  late FirestoreSchemaMapper mapper;
  final now = DateTime(2026, 8, 14, 12);

  setUp(() {
    mapper = FirestoreSchemaMapper(clock: () => now);
  });

  group('fish inventory mapping', () {
    test('normalizes aliases, enriches catalog fields, and clamps counts', () {
      final fish = mapper.fishFromDocument(
        const FirestoreDocumentData(
          id: 'fish-1',
          data: <String, dynamic>{
            'species_id': 'black-widow-tetra',
            'name': 'Legacy display name',
            'count': 3.0,
            'detected': 8,
          },
        ),
      );

      expect(fish.id, 'fish-1');
      expect(fish.speciesId, 'black_skirt_tetra');
      expect(fish.name, 'Black Skirt Tetra');
      expect(fish.scientificName, isNotEmpty);
      expect(fish.assetPath, contains('black_widow_tetra'));
      expect(fish.count, 3);
      expect(fish.detected, 3);
    });

    test('uses stable species/id ordering instead of snapshot order', () {
      final fish = mapper.fishInventoryFromDocuments(
        const <FirestoreDocumentData>[
          FirestoreDocumentData(
            id: 'z',
            data: <String, dynamic>{'species_id': 'guppy', 'count': 1},
          ),
          FirestoreDocumentData(
            id: 'b',
            data: <String, dynamic>{'species_id': 'betta', 'count': 1},
          ),
          FirestoreDocumentData(
            id: 'a',
            data: <String, dynamic>{'species_id': 'betta', 'count': 1},
          ),
        ],
      );

      expect(fish.map((entry) => entry.id), <String>['a', 'b', 'z']);
    });
  });

  group('readings, history, and analytics mapping', () {
    test('keeps score and FNU distinct and normalizes species aliases', () {
      final reading = mapper.readingFromDocument(
        FirestoreDocumentData(
          id: 'reading-1',
          data: <String, dynamic>{
            'tank_id': 'tank-1',
            'timestamp': Timestamp.fromDate(
              now.subtract(const Duration(hours: 1)),
            ),
            'clarity': 7,
            'clarity_score': 8.25,
            'turbidity_fnu': 2,
            'fish_count': 4.0,
            'fish_count_confidence': 0.88,
            'species_detected': <String, dynamic>{
              'common_pleco': 1,
              'plecostomus': 2.0,
              'Black Widow Tetra': 1,
            },
            'ph': 7.2,
            'temperature_c': 26,
          },
        ),
      );

      expect(reading.clarityScore, 8.25);
      expect(reading.turbidityFnu, 2);
      expect(reading.fishCount, 4);
      expect(reading.speciesDetected, <String, int>{
        'black_skirt_tetra': 1,
        'plecostomus': 3,
      });
      final turbidity = mapper
          .waterMetricsFromReading(reading)
          .singleWhere((metric) => metric.label == 'Turbidity');
      expect(turbidity.value, '2.0');
      expect(turbidity.unit, 'FNU');
    });

    test('never presents a legacy clarity score as FNU', () {
      final reading = mapper.readingFromDocument(
        const FirestoreDocumentData(
          id: 'legacy',
          data: <String, dynamic>{'clarity': 8, 'fish_count': 2},
        ),
      );

      expect(reading.clarityScore, 8);
      expect(reading.turbidityFnu, isNull);
      expect(
        mapper.waterMetricsFromReading(reading).map((metric) => metric.label),
        isNot(contains('Turbidity')),
      );
    });

    test('excludes seed/pending readings and sorts history newest first', () {
      final readings = mapper.readingsFromDocuments(<FirestoreDocumentData>[
        FirestoreDocumentData(
          id: 'older',
          data: <String, dynamic>{
            'timestamp': now
                .subtract(const Duration(hours: 2))
                .millisecondsSinceEpoch,
            'clarity': 6,
            'fish_count': 2,
          },
        ),
        FirestoreDocumentData(
          id: 'pending',
          data: const <String, dynamic>{'clarity': 7, 'fish_count': 3},
        ),
        FirestoreDocumentData(
          id: 'newer',
          data: <String, dynamic>{
            'timestamp': now.subtract(const Duration(hours: 1)),
            'clarity': 9,
            'fish_count': 4,
          },
        ),
        FirestoreDocumentData(
          id: 'seed',
          data: <String, dynamic>{
            'timestamp': now,
            'clarity': 0,
            'fish_count': 0,
          },
        ),
      ]);

      final history = mapper.historyFromReadings(readings);
      final bundle = mapper.readingBundleFromDocuments(<FirestoreDocumentData>[
        FirestoreDocumentData(
          id: 'seed',
          data: <String, dynamic>{
            'timestamp': now,
            'clarity': 0,
            'fish_count': 0,
          },
        ),
        FirestoreDocumentData(
          id: 'real',
          data: <String, dynamic>{
            'timestamp': now.subtract(const Duration(minutes: 1)),
            'clarity': 7,
            'fish_count': 3,
          },
        ),
      ]);

      expect(history, hasLength(2));
      expect(history.map((reading) => reading.clarity), <double>[9, 6]);
      expect(history.first.fishCount, 4);
      expect(bundle.readings, hasLength(2));
      expect(bundle.history, hasLength(1));
      expect(bundle.analytics.points, hasLength(1));
      expect(bundle.latestRealReading?.id, 'real');
    });

    test('analytics is chronological and clarity is score times ten', () {
      final readings = <ProductionReading>[
        ProductionReading(
          id: 'new',
          tankId: 'tank',
          timestamp: now,
          clarityScore: 7.5,
          fishCount: 5,
          fishCountConfidence: 1,
          speciesDetected: const <String, int>{'guppy': 2},
          frameUrl: '',
          detections: const <NormalizedDetectionCenter>[],
        ),
        ProductionReading(
          id: 'old',
          tankId: 'tank',
          timestamp: now.subtract(const Duration(hours: 1)),
          clarityScore: 8,
          fishCount: 4,
          fishCountConfidence: 1,
          speciesDetected: const <String, int>{'guppy': 1},
          frameUrl: '',
          detections: const <NormalizedDetectionCenter>[],
        ),
      ];

      final analytics = mapper.analyticsFromReadings(readings);

      expect(analytics.points.map((point) => point.timestamp), <DateTime>[
        now.subtract(const Duration(hours: 1)),
        now,
      ]);
      expect(analytics.claritySeries.map((point) => point.value), <double>[
        80,
        75,
      ]);
      expect(
        analytics.speciesSeries['guppy']!.map((point) => point.value),
        <double>[1, 2],
      );
    });
  });

  group('alerts and supporting records', () {
    test('derives current alert presentation and retains its timestamp', () {
      final alert = mapper.alertFromDocument(
        FirestoreDocumentData(
          id: 'alert-1',
          data: <String, dynamic>{
            'tank_id': 'tank',
            'type': 'fish_zero',
            'message': 'No fish were detected.',
            'tip': 'Inspect hiding places.',
            'severity': 'CRITICAL',
            'timestamp': now.subtract(const Duration(minutes: 35)),
            'context': <String, dynamic>{
              'clarity_before': 8.0,
              'clarity_after': 6.5,
              'fish_count_before': 4,
              'fish_count_after': 0,
            },
          },
        ),
      );

      expect(alert.timestamp, now.subtract(const Duration(minutes: 35)));
      expect(alert.item.title, 'No fish visible');
      expect(alert.item.timeLabel, '35m ago');
      expect(alert.item.severity, AlertSeverity.critical);
      expect(alert.item.clarityBefore, '8');
      expect(alert.item.clarityAfter, '6.5');
      expect(alert.item.fishAfter, '0');
    });

    test('unknown alert fields fall back safely', () {
      final alert = mapper.alertFromDocument(
        const FirestoreDocumentData(
          id: 'unknown',
          data: <String, dynamic>{'type': 'future_type', 'severity': 'odd'},
        ),
      );

      expect(alert.item.title, 'Aquarium update');
      expect(alert.item.severity, AlertSeverity.info);
      expect(alert.item.message, isNotEmpty);
      expect(alert.item.timeLabel, isEmpty);
    });

    test('maps legacy tank thresholds into current FNU units', () {
      final tank = mapper.tankFromDocument(
        const FirestoreDocumentData(
          id: 'tank',
          data: <String, dynamic>{
            'name': 'Reef',
            'owner_id': 'owner',
            'monitor_uids': <dynamic>['monitor', 'owner'],
            'viewers': <dynamic>['z', 'a', 'z', 3],
            'thresholds': <String, dynamic>{
              'clarity_min': 6,
              'fish_change_pct': 45.0,
            },
            'calibration': <String, dynamic>{'water_line_y': 1.2},
          },
        ),
      );

      expect(tank.monitorIds, <String>['monitor', 'owner']);
      expect(tank.roleFor('owner'), ProductionTankMemberRole.owner);
      expect(tank.roleFor('monitor'), ProductionTankMemberRole.monitor);
      expect(tank.viewerIds, <String>['a', 'z']);
      expect(tank.thresholds.clarityScoreMin, 6);
      expect(
        tank.thresholds.turbidityFnuMax,
        closeTo(ProductionTankThresholds.fnuFromClarityScore(6), 0.0001),
      );
      expect(tank.waterLineY, 1);
    });

    test('merges legacy and array FCM tokens deterministically', () {
      final user = mapper.userFromDocument(
        const FirestoreDocumentData(
          id: 'user',
          data: <String, dynamic>{
            'tanks': <dynamic>['tank-b', 'tank-a', 'tank-b'],
            'fcm_token': 'token-b',
            'fcm_tokens': <dynamic>['token-c', 'token-b', 1],
          },
        ),
      );

      expect(user.tankIds, <String>['tank-a', 'tank-b']);
      expect(user.fcmTokens, <String>['token-b', 'token-c']);
    });
  });

  group('write compatibility', () {
    test('writes explicit score, legacy score, and raw FNU independently', () {
      const draft = ProductionReadingDraft(
        tankId: 'tank',
        clarityScore: 8.4,
        turbidityFnu: 2.7,
        fishCount: 3,
        speciesDetected: <String, int>{'common_pleco': 1},
      );

      final data = mapper.readingData(draft, serverTimestamp: 'server-time');

      expect(data['timestamp'], 'server-time');
      expect(data['clarity'], 8.4);
      expect(data['clarity_score'], 8.4);
      expect(data['turbidity_fnu'], 2.7);
      expect(data['species_detected'], <String, int>{'plecostomus': 1});
    });

    test('writes and reads detection boxes with confidence metadata', () {
      final draft = ProductionReadingDraft(
        tankId: 'tank',
        clarityScore: 8.4,
        fishCount: 1,
        speciesDetected: const <String, int>{'cardinal_tetra': 1},
        fishDetections: [
          FishDetection(
            box: NormalizedFishBox.fromEdges(
              left: 0.35,
              top: 0.40,
              right: 0.65,
              bottom: 0.60,
            ),
            detectionConfidence: 0.81,
            speciesId: 'cardinal_tetra',
            classificationConfidence: 0.94,
          ),
        ],
        frameDimensions: const DetectionFrameDimensions(
          width: 1920,
          height: 1080,
        ),
      );

      final data = mapper.readingData(draft, serverTimestamp: 'server-time');
      final detections = data['detections'] as List<Object?>;
      final detection = detections.single as Map<String, Object?>;

      expect(detection['left'], 0.35);
      expect(detection['right'], 0.65);
      expect(detection['detection_confidence'], 0.81);
      expect(detection['classification_confidence'], 0.94);

      final reading = mapper.readingFromDocument(
        FirestoreDocumentData(
          id: 'reading',
          data: <String, dynamic>{...data, 'timestamp': now},
        ),
      );

      expect(reading.fishDetections, hasLength(1));
      expect(reading.fishDetections.single.box.left, closeTo(0.35, 0.0001));
      expect(reading.fishDetections.single.speciesId, 'cardinal_tetra');
      expect(
        reading.fishDetections.single.classificationConfidence,
        closeTo(0.94, 0.0001),
      );
      expect(reading.frameDimensions?.width, 1920);
    });

    test('writes both current and converted legacy threshold fields', () {
      const thresholds = ProductionTankThresholds(
        turbidityFnuMax: 5,
        clarityScoreMin: 2,
        visibleFishChangePercent: 40,
      );

      final data = mapper.thresholdsData(thresholds);

      expect(data['turbidity_fnu_max'], 5);
      expect(
        data['clarity_min'],
        closeTo(ProductionTankThresholds.clarityScoreFromFnu(5), 0.0001),
      );
      expect(data['fish_change_pct'], 40);
    });

    test('new tank/live writes use hardened monitor fields only', () {
      final tank = mapper.tankCreateData(
        name: 'Tank',
        ownerId: 'owner',
        serverTimestamp: 'server-time',
      );
      final live = mapper.initialLiveStateData(
        publisherId: 'owner',
        serverTimestamp: 'server-time',
      );

      expect(tank['monitor_uids'], <String>['owner']);
      expect(live['publisher_uid'], 'owner');
      expect(live, isNot(contains('requested')));
      expect(live, isNot(contains('stream_url')));
      expect(live, isNot(contains('current_clarity_score')));
    });

    test('maps live request documents in deterministic order', () {
      final requests = mapper.liveRequestsFromDocuments(<FirestoreDocumentData>[
        FirestoreDocumentData(
          id: 'viewer-b',
          data: <String, dynamic>{
            'requested_at': now.subtract(const Duration(minutes: 2)),
          },
        ),
        FirestoreDocumentData(
          id: 'viewer-a',
          data: <String, dynamic>{'requested_at': now},
        ),
      ]);

      expect(requests.map((request) => request.userId), <String>[
        'viewer-a',
        'viewer-b',
      ]);
    });
  });
}
