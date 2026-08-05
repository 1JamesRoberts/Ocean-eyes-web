import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/models/demo_fixtures.dart';
import 'package:oceaneyes/ui/widgets/data_visuals.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

void main() {
  group('reference heatmap raster', () {
    test('matches the reference object-cover crop for a wide source', () {
      final rect = calculateHeatmapObjectCoverRect(
        sourceWidth: 640,
        sourceHeight: 360,
        containerWidth: 393,
        containerHeight: 277,
      );

      expect(rect.width, closeTo(492.4444, 0.0001));
      expect(rect.height, 277);
      expect(rect.left, closeTo(-49.7222, 0.0001));
      expect(rect.top, 0);
    });

    test('matches the reference object-cover crop for a tall source', () {
      final rect = calculateHeatmapObjectCoverRect(
        sourceWidth: 360,
        sourceHeight: 640,
        containerWidth: 393,
        containerHeight: 221,
      );

      expect(rect.width, 393);
      expect(rect.height, closeTo(698.6667, 0.0001));
      expect(rect.left, closeTo(0, 0.0001));
      expect(rect.top, closeTo(-238.8333, 0.0001));
    });

    test('returns no raster when there are no detections', () {
      expect(
        buildHeatmapRaster(
          centers: const [],
          renderWidth: 21,
          renderHeight: 21,
        ),
        isNull,
      );
    });

    test('uses the exact JET endpoints and constant alpha', () {
      final raster = buildHeatmapRaster(
        centers: const [
          NormalizedDetectionCenter(nx: 0.5, ny: 0.5, speciesId: 'guppy'),
        ],
        renderWidth: 21,
        renderHeight: 21,
      )!;

      List<int> pixelAt(int x, int y) {
        final offset = (y * raster.width + x) * 4;
        return raster.rgba.sublist(offset, offset + 4);
      }

      expect(pixelAt(10, 10), [128, 0, 0, 140]);
      expect(pixelAt(0, 0), [0, 0, 128, 140]);
      for (var offset = 3; offset < raster.rgba.length; offset += 4) {
        expect(raster.rgba[offset], 140);
      }
    });

    test('keeps an off-frame-only texture transparent', () {
      final raster = buildHeatmapRaster(
        centers: const [
          NormalizedDetectionCenter(nx: 2, ny: 2, speciesId: 'guppy'),
        ],
        renderWidth: 21,
        renderHeight: 21,
      )!;

      expect(raster.rgba.every((channel) => channel == 0), isTrue);
    });
  });

  group('heatmap fixture projection', () {
    test('filters populated centers by the selected inventory species', () {
      final controller = OceanEyesController()
        ..applyFixture(FixtureScenario.populated, notify: false);

      expect(controller.selectedHeatmapCenters, hasLength(7));
      expect(
        controller.heatmapSourceDimensions,
        DemoFixtures.heatmapSourceDimensions,
      );

      controller.setSelectedSpecies('Guppy');
      expect(controller.selectedHeatmapCenters, hasLength(2));
      expect(
        controller.selectedHeatmapCenters.every(
          (center) => center.speciesId == 'guppy',
        ),
        isTrue,
      );
      controller.dispose();
    });

    test('clears centers for every no-data analytics fixture', () {
      final controller = OceanEyesController();
      for (final scenario in [
        FixtureScenario.dashboardWaiting,
        FixtureScenario.analyticsLoading,
        FixtureScenario.analyticsEmpty,
        FixtureScenario.analyticsError,
      ]) {
        controller.applyFixture(scenario, notify: false);
        expect(
          controller.selectedHeatmapCenters,
          isEmpty,
          reason: '$scenario must not retain a synthetic heatmap',
        );
      }
      controller.dispose();
    });
  });
}
