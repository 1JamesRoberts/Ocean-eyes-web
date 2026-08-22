import 'aquarium_models.dart';
import 'demo_fixtures.dart';

/// Pure projection of aquarium inventory into deterministic analytics series.
abstract final class AnalyticsSeriesService {
  static const _allSpecies = 'All species';
  static final _diagnosticScanTime = DateTime(2026, 7, 31, 10, 42);

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
    if (source.isEmpty || selectedSpecies == _allSpecies) return source;

    final selectedIndex = _selectedFishIndex(fish, selectedSpecies);
    if (selectedIndex < 0) return const [];
    final totalFish = fish.fold<int>(0, (sum, entry) => sum + entry.count);
    if (totalFish == 0) return const [];
    final ratio = fish[selectedIndex].count / totalFish;
    return _mapChartValues(source, (value) => (value * ratio).roundToDouble());
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
    if (source.isEmpty || selectedSpecies == _allSpecies) return source;

    final selectedIndex = _selectedFishIndex(fish, selectedSpecies);
    if (selectedIndex < 0) return const [];
    final factor = 0.82 + selectedIndex * 0.04;
    return _mapChartValues(
      source,
      (value) => double.parse((value * factor).toStringAsFixed(1)),
    );
  }

  static List<FishDiagnostic> diagnostics(
    List<FishEntry> fish,
    String selectedSpecies, {
    DateTime? rangeStart,
    DateTime? rangeEnd,
  }) {
    final selected = selectedSpecies == _allSpecies
        ? fish.take(2)
        : fish.where((entry) => entry.name == selectedSpecies);
    return selected.indexed
        .map(
          (entry) => FishDiagnostic(
            fish: entry.$2,
            status: 'Healthy',
            confidence: 96 - entry.$1 * 3,
            scannedAt: _diagnosticScanTime.subtract(
              Duration(minutes: entry.$1 * 17),
            ),
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

  static List<ChartPoint> _mapChartValues(
    Iterable<ChartPoint> points,
    double Function(double value) transform,
  ) => points
      .map(
        (point) => ChartPoint(
          point.label,
          transform(point.value),
          timestamp: point.timestamp,
        ),
      )
      .toList(growable: false);

  static int _selectedFishIndex(List<FishEntry> fish, String selectedSpecies) =>
      fish.indexWhere((entry) => entry.name == selectedSpecies);

  static bool _isInRange(
    DateTime timestamp, {
    DateTime? rangeStart,
    DateTime? rangeEnd,
  }) {
    if (rangeStart != null && timestamp.isBefore(rangeStart)) return false;
    if (rangeEnd != null && timestamp.isAfter(rangeEnd)) return false;
    return true;
  }
}
