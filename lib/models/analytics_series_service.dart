import 'aquarium_models.dart';
import 'demo_fixtures.dart';

/// Pure projection of aquarium inventory into deterministic analytics series.
abstract final class AnalyticsSeriesService {
  static List<ChartPoint> fishCount(
    List<FishEntry> fish,
    String selectedSpecies, {
    DateTime? rangeStart,
    DateTime? rangeEnd,
  }) {
    if (fish.isEmpty) return const [];
    final source = filterByRange(
      DemoFixtures.fishCountSeries,
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
    );
    if (source.isEmpty) return const [];
    if (selectedSpecies == 'All species') {
      return source;
    }
    final selected = _selectedFish(fish, selectedSpecies);
    final totalFish = fish.fold<int>(0, (sum, entry) => sum + entry.count);
    if (selected == null || totalFish == 0) return const [];
    return source
        .map(
          (point) => ChartPoint(
            point.label,
            (point.value * selected.count / totalFish).roundToDouble(),
            timestamp: point.timestamp,
          ),
        )
        .toList(growable: false);
  }

  static List<ChartPoint> spread(
    List<FishEntry> fish,
    String selectedSpecies, {
    DateTime? rangeStart,
    DateTime? rangeEnd,
  }) {
    if (fish.isEmpty) return const [];
    final source = filterByRange(
      DemoFixtures.spreadSeries,
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
    );
    if (source.isEmpty) return const [];
    if (selectedSpecies == 'All species') return source;
    final selectedIndex = fish.indexWhere(
      (entry) => entry.name == selectedSpecies,
    );
    if (selectedIndex < 0) return const [];
    final factor = 0.82 + selectedIndex * 0.04;
    return source
        .map(
          (point) => ChartPoint(
            point.label,
            double.parse((point.value * factor).toStringAsFixed(1)),
            timestamp: point.timestamp,
          ),
        )
        .toList(growable: false);
  }

  static List<FishDiagnostic> diagnostics(
    List<FishEntry> fish,
    String selectedSpecies, {
    DateTime? rangeStart,
    DateTime? rangeEnd,
  }) {
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
        .where(
          (diagnostic) => _isInRange(
            diagnostic.scannedAt,
            rangeStart: rangeStart,
            rangeEnd: rangeEnd,
          ),
        )
        .toList(growable: false);
  }

  static List<ChartPoint> filterByRange(
    Iterable<ChartPoint> points, {
    DateTime? rangeStart,
    DateTime? rangeEnd,
  }) {
    if (rangeStart == null && rangeEnd == null) {
      return points is List<ChartPoint>
          ? points
          : points.toList(growable: false);
    }
    return points
        .where(
          (point) =>
              point.timestamp == null ||
              _isInRange(
                point.timestamp!,
                rangeStart: rangeStart,
                rangeEnd: rangeEnd,
              ),
        )
        .toList(growable: false);
  }

  static bool _isInRange(
    DateTime timestamp, {
    DateTime? rangeStart,
    DateTime? rangeEnd,
  }) {
    if (rangeStart != null && timestamp.isBefore(rangeStart)) return false;
    if (rangeEnd != null && timestamp.isAfter(rangeEnd)) return false;
    return true;
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
