import 'aquarium_models.dart';
import 'demo_fixtures.dart';

/// Pure projection of aquarium inventory into deterministic analytics series.
abstract final class AnalyticsSeriesService {
  static List<ChartPoint> fishCount(
    List<FishEntry> fish,
    String selectedSpecies,
  ) {
    if (fish.isEmpty) return const [];
    if (selectedSpecies == 'All species') {
      return DemoFixtures.fishCountSeries;
    }
    final selected = _selectedFish(fish, selectedSpecies);
    final totalFish = fish.fold<int>(0, (sum, entry) => sum + entry.count);
    if (selected == null || totalFish == 0) return const [];
    return DemoFixtures.fishCountSeries
        .map(
          (point) => ChartPoint(
            point.label,
            (point.value * selected.count / totalFish).roundToDouble(),
          ),
        )
        .toList(growable: false);
  }

  static List<ChartPoint> spread(List<FishEntry> fish, String selectedSpecies) {
    if (fish.isEmpty) return const [];
    if (selectedSpecies == 'All species') return DemoFixtures.spreadSeries;
    final selectedIndex = fish.indexWhere(
      (entry) => entry.name == selectedSpecies,
    );
    if (selectedIndex < 0) return const [];
    final factor = 0.82 + selectedIndex * 0.04;
    return DemoFixtures.spreadSeries
        .map(
          (point) => ChartPoint(
            point.label,
            double.parse((point.value * factor).toStringAsFixed(1)),
          ),
        )
        .toList(growable: false);
  }

  static List<FishDiagnostic> diagnostics(
    List<FishEntry> fish,
    String selectedSpecies,
  ) {
    final selected = selectedSpecies == 'All species'
        ? fish.take(2)
        : fish.where((entry) => entry.name == selectedSpecies);
    return selected.indexed
        .map(
          (entry) => FishDiagnostic(
            fish: entry.$2,
            status: 'Healthy',
            confidence: 96 - entry.$1 * 3,
            scannedAt: DateTime(
              2026,
              7,
              31,
              10,
              42,
            ).subtract(Duration(minutes: entry.$1 * 17)),
            observation:
                'Color, posture, and fin movement are consistent with healthy '
                'behavior.',
          ),
        )
        .toList(growable: false);
  }

  static FishEntry? _selectedFish(
    List<FishEntry> fish,
    String selectedSpecies,
  ) {
    for (final entry in fish) {
      if (entry.name == selectedSpecies) return entry;
    }
    return null;
  }
}
