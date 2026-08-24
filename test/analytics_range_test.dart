import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/firebase/firestore_schema_mapper.dart';
import 'package:oceaneyes/models/analytics_series_service.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/models/production_data.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';
import 'support/oceaneyes_fixture.dart';

void main() {
  test('fixture analytics projections consume the selected range', () {
    final controller = FixtureOceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/?fixture=populated'),
    );
    addTearDown(controller.dispose);

    final midday = DateTimeRange(
      start: DateTime(2026, 7, 31, 12),
      end: DateTime(2026, 7, 31, 12, 1),
    );
    controller.setAnalyticsRange(midday);

    expect(controller.claritySeries.map((point) => point.label), ['12p']);
    expect(controller.fishCountPoints.map((point) => point.label), ['12p']);
    expect(controller.spreadPoints.map((point) => point.label), ['12p']);
    expect(controller.fishDiagnostics, isEmpty);

    controller.setAnalyticsRange(
      DateTimeRange(
        start: DateTime(2026, 7, 31, 10),
        end: DateTime(2026, 7, 31, 11),
      ),
    );
    expect(controller.fishDiagnostics, hasLength(2));
  });

  test('controller rejects zero-duration analytics ranges', () {
    final controller = OceanEyesController();
    addTearDown(controller.dispose);
    final previous = controller.analyticsRange;
    final zeroDuration = DateTime(
      previous.start.year,
      previous.start.month,
      previous.start.day,
      previous.start.hour,
      previous.start.minute,
    );

    expect(
      () => controller.setAnalyticsRange(
        DateTimeRange(start: zeroDuration, end: zeroDuration),
      ),
      throwsArgumentError,
    );
    expect(controller.analyticsRange.start, previous.start);
    expect(controller.analyticsRange.end, previous.end);
  });

  test(
    'production analytics mapping filters points and detections by range',
    () {
      final mapper = FirestoreSchemaMapper();
      final early = _productionReading(
        id: 'early',
        timestamp: DateTime(2026, 8, 14, 9),
        fishCount: 2,
        detections: const [
          NormalizedDetectionCenter(nx: 0.2, ny: 0.3, speciesId: 'guppy'),
        ],
      );
      final late = _productionReading(
        id: 'late',
        timestamp: DateTime(2026, 8, 14, 10),
        fishCount: 3,
        detections: const [
          NormalizedDetectionCenter(nx: 0.8, ny: 0.7, speciesId: 'guppy'),
        ],
      );

      final analytics = mapper
          .analyticsFromReadings([early, late])
          .filteredByRange(
            rangeStart: DateTime(2026, 8, 14, 9, 30),
            rangeEnd: DateTime(2026, 8, 14, 10),
          );

      expect(analytics.points.map((point) => point.timestamp), [
        late.timestamp,
      ]);
      expect(analytics.fishCountSeries.single.value, 3);
      expect(analytics.heatmapCenters.single.nx, 0.8);
    },
  );

  test(
    'analytics service leaves untimestamped points available without a range',
    () {
      const points = [ChartPoint('sample', 1)];
      final filtered = AnalyticsSeriesService.filterByRange(
        points,
        rangeStart: DateTime(2026, 1, 1),
        rangeEnd: DateTime(2026, 1, 2),
      );
      expect(filtered, hasLength(1));
      expect(filtered.single.label, 'sample');
    },
  );
}

ProductionReading _productionReading({
  required String id,
  required DateTime timestamp,
  required int fishCount,
  required List<NormalizedDetectionCenter> detections,
}) {
  return ProductionReading(
    id: id,
    tankId: 'tank',
    timestamp: timestamp,
    clarityScore: 8,
    turbidityFnu: 2,
    fishCount: fishCount,
    fishCountConfidence: 1,
    speciesDetected: const {'guppy': 1},
    frameUrl: '',
    detections: detections,
  );
}
