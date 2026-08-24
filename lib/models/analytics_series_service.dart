import 'aquarium_models.dart';

/// Pure projection of aquarium inventory into deterministic analytics series.
abstract final class AnalyticsSeriesService {
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
}
