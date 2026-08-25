import 'aquarium_models.dart';

enum ProductionTankMemberRole { owner, monitor, viewer, none }

enum ProductionLiveRole { monitor, viewer }

extension ProductionTankMemberRoleLiveRole on ProductionTankMemberRole {
  /// Owners and monitors publish the aquarium feed from the monitor side.
  /// Unknown roles keep the monitor-side fallback used by local preview.
  ProductionLiveRole get liveRole => switch (this) {
    ProductionTankMemberRole.viewer => ProductionLiveRole.viewer,
    _ => ProductionLiveRole.monitor,
  };
}

/// Tank alert thresholds in both the current and deployed compatibility units.
///
/// The deployed application stores a minimum clarity score on a 1-10 scale.
/// The current application exposes a maximum turbidity value in FNU. They are
/// deliberately retained as separate fields so a raw FNU value is never
/// presented as a clarity score (or vice versa).
class ProductionTankThresholds {
  const ProductionTankThresholds({
    required this.turbidityFnuMax,
    required this.clarityScoreMin,
    required this.visibleFishChangePercent,
  });

  static const double modelFnuMin = 0.44;
  static const double modelFnuMax = 53.42;

  /// Current defaults. The compatibility score is the rounded inverse of
  /// [turbidityFnuMax] using the deployed model's linear conversion.
  static const defaults = ProductionTankThresholds(
    turbidityFnuMax: 5,
    clarityScoreMin: 9.2,
    visibleFishChangePercent: 50,
  );

  final double turbidityFnuMax;
  final double clarityScoreMin;
  final double visibleFishChangePercent;

  static double fnuFromClarityScore(double score) {
    final normalizedScore = score.clamp(1.0, 10.0);
    return modelFnuMin +
        ((10 - normalizedScore) / 9) * (modelFnuMax - modelFnuMin);
  }

  static double clarityScoreFromFnu(double fnu) {
    final normalizedFnu = fnu.clamp(modelFnuMin, modelFnuMax);
    return 10 -
        ((normalizedFnu - modelFnuMin) / (modelFnuMax - modelFnuMin)) * 9;
  }
}

class ProductionTank {
  const ProductionTank({
    required this.id,
    required this.name,
    required this.ownerId,
    required this.monitorIds,
    required this.viewerIds,
    required this.thresholds,
    required this.recalibrationRequested,
    this.createdAt,
    this.waterLineY,
  });

  final String id;
  final String name;
  final String ownerId;
  final List<String> monitorIds;
  final List<String> viewerIds;
  final DateTime? createdAt;
  final ProductionTankThresholds thresholds;
  final double? waterLineY;
  final bool recalibrationRequested;

  ProductionTankMemberRole roleFor(String userId) {
    if (userId.isEmpty) return ProductionTankMemberRole.none;
    if (ownerId == userId) return ProductionTankMemberRole.owner;
    if (monitorIds.contains(userId)) return ProductionTankMemberRole.monitor;
    if (viewerIds.contains(userId)) return ProductionTankMemberRole.viewer;
    return ProductionTankMemberRole.none;
  }
}

class ProductionUser {
  const ProductionUser({
    required this.id,
    required this.tankIds,
    required this.fcmTokens,
    this.createdAt,
    this.displayName,
    this.email,
    this.photoUrl,
  });

  final String id;
  final List<String> tankIds;
  final List<String> fcmTokens;
  final DateTime? createdAt;
  final String? displayName;
  final String? email;
  final String? photoUrl;
}

/// A mapped reading that keeps compatibility values distinct.
class ProductionReading {
  const ProductionReading({
    required this.id,
    required this.tankId,
    required this.fishCount,
    required this.fishCountConfidence,
    required this.speciesDetected,
    required this.frameUrl,
    required this.detections,
    this.timestamp,
    this.clarityScore,
    this.turbidityFnu,
    this.ph,
    this.temperatureCelsius,
    this.ammoniaPpm,
    this.nitritePpm,
    this.frameDimensions,
  });

  final String id;
  final String tankId;
  final DateTime? timestamp;

  /// The legacy/current explicit 1-10 clarity score.
  final double? clarityScore;

  /// Raw water-clarity inference in FNU. Never inferred from [clarityScore].
  final double? turbidityFnu;

  final int fishCount;
  final double fishCountConfidence;
  final Map<String, int> speciesDetected;
  final String frameUrl;
  final double? ph;
  final double? temperatureCelsius;
  final double? ammoniaPpm;
  final double? nitritePpm;
  final List<NormalizedDetectionCenter> detections;
  final DetectionFrameDimensions? frameDimensions;

  /// Seed readings and writes with pending timestamps do not enter history or
  /// analytics, but remain useful for initializing live state.
  bool get isHistoryReading =>
      timestamp != null && clarityScore != null && clarityScore! > 0;
}

class ProductionReadingDraft {
  const ProductionReadingDraft({
    required this.tankId,
    required this.clarityScore,
    required this.fishCount,
    this.turbidityFnu,
    this.fishCountConfidence = 1,
    this.speciesDetected = const {},
    this.frameUrl = '',
    this.ph,
    this.temperatureCelsius,
    this.ammoniaPpm,
    this.nitritePpm,
    this.detections = const [],
    this.frameDimensions,
  });

  final String tankId;
  final double clarityScore;
  final double? turbidityFnu;
  final int fishCount;
  final double fishCountConfidence;
  final Map<String, int> speciesDetected;
  final String frameUrl;
  final double? ph;
  final double? temperatureCelsius;
  final double? ammoniaPpm;
  final double? nitritePpm;
  final List<NormalizedDetectionCenter> detections;
  final DetectionFrameDimensions? frameDimensions;
}

/// One coherently mapped Firestore reading snapshot.
///
/// Consumers that need dashboard, history, and analytics data together should
/// prefer this bundle so they do not establish three identical billed
/// Firestore listeners.
class ProductionReadingBundle {
  const ProductionReadingBundle({
    required this.readings,
    required this.history,
    required this.analytics,
  });

  static const empty = ProductionReadingBundle(
    readings: [],
    history: [],
    analytics: ProductionAnalyticsData.empty,
  );

  /// Newest first, including seed and pending-timestamp documents.
  final List<ProductionReading> readings;
  final List<HistoryReading> history;
  final ProductionAnalyticsData analytics;

  ProductionReading? get latestRealReading {
    for (final reading in readings) {
      if (reading.isHistoryReading) return reading;
    }
    return null;
  }
}

class ProductionFishDraft {
  const ProductionFishDraft({
    required this.tankId,
    required this.speciesId,
    required this.name,
    this.emoji = '🐟',
    this.count = 1,
  });

  final String tankId;
  final String speciesId;
  final String name;
  final String emoji;
  final int count;
}

/// An alert retains its source timestamp alongside the current UI projection.
class ProductionAlert {
  const ProductionAlert({
    required this.id,
    required this.tankId,
    required this.type,
    required this.item,
    this.timestamp,
    this.snoozedUntil,
  });

  final String id;
  final String tankId;
  final String type;
  final AlertItem item;
  final DateTime? timestamp;
  final DateTime? snoozedUntil;
}

/// A timestamped point used to derive the current analytics chart series.
class ProductionAnalyticsPoint {
  const ProductionAnalyticsPoint({
    required this.timestamp,
    required this.label,
    required this.clarityPercent,
    required this.fishCount,
    required this.speciesDetected,
    this.detections = const [],
    this.frameDimensions,
  });

  final DateTime timestamp;
  final String label;
  final double clarityPercent;
  final int fishCount;
  final Map<String, int> speciesDetected;
  final List<NormalizedDetectionCenter> detections;
  final DetectionFrameDimensions? frameDimensions;
}

class ProductionAnalyticsData {
  const ProductionAnalyticsData({
    required this.points,
    required this.claritySeries,
    required this.fishCountSeries,
    required this.speciesSeries,
    required this.heatmapCenters,
    this.heatmapSourceDimensions,
  });

  static const empty = ProductionAnalyticsData(
    points: [],
    claritySeries: [],
    fishCountSeries: [],
    speciesSeries: {},
    heatmapCenters: [],
  );

  /// Chronological, oldest first, irrespective of Firestore document order.
  final List<ProductionAnalyticsPoint> points;
  final List<ChartPoint> claritySeries;
  final List<ChartPoint> fishCountSeries;
  final Map<String, List<ChartPoint>> speciesSeries;
  final List<NormalizedDetectionCenter> heatmapCenters;
  final DetectionFrameDimensions? heatmapSourceDimensions;

  ProductionAnalyticsData filteredByRange({
    required DateTime rangeStart,
    required DateTime rangeEnd,
  }) {
    final filteredPoints = points
        .where(
          (point) =>
              !point.timestamp.isBefore(rangeStart) &&
              !point.timestamp.isAfter(rangeEnd),
        )
        .toList(growable: false);
    if (filteredPoints.isEmpty) return empty;
    if (filteredPoints.length == points.length) return this;

    final speciesIds = <String>{};
    for (final point in filteredPoints) {
      speciesIds.addAll(point.speciesDetected.keys);
    }
    final speciesSeries = <String, List<ChartPoint>>{
      for (final speciesId in speciesIds)
        speciesId: List.unmodifiable(
          filteredPoints.map(
            (point) => ChartPoint(
              point.label,
              (point.speciesDetected[speciesId] ?? 0).toDouble(),
              timestamp: point.timestamp,
            ),
          ),
        ),
    };

    ProductionAnalyticsPoint? latestWithDetections;
    for (final point in filteredPoints.reversed) {
      if (point.detections.isNotEmpty) {
        latestWithDetections = point;
        break;
      }
    }
    final hasPointDetectionMetadata = points.any(
      (point) => point.detections.isNotEmpty || point.frameDimensions != null,
    );
    final includesAllPoints = filteredPoints.length == points.length;
    final List<NormalizedDetectionCenter> filteredHeatmapCenters =
        hasPointDetectionMetadata
        ? latestWithDetections?.detections ?? const []
        : includesAllPoints
        ? heatmapCenters
        : const [];
    final filteredHeatmapDimensions = hasPointDetectionMetadata
        ? latestWithDetections?.frameDimensions
        : includesAllPoints
        ? heatmapSourceDimensions
        : null;

    return ProductionAnalyticsData(
      points: filteredPoints,
      claritySeries: List.unmodifiable(
        filteredPoints.map(
          (point) => ChartPoint(
            point.label,
            point.clarityPercent,
            timestamp: point.timestamp,
          ),
        ),
      ),
      fishCountSeries: List.unmodifiable(
        filteredPoints.map(
          (point) => ChartPoint(
            point.label,
            point.fishCount.toDouble(),
            timestamp: point.timestamp,
          ),
        ),
      ),
      speciesSeries: Map.unmodifiable(speciesSeries),
      heatmapCenters: filteredHeatmapCenters,
      heatmapSourceDimensions: filteredHeatmapDimensions,
    );
  }
}

class ProductionLiveState {
  const ProductionLiveState({
    required this.tankId,
    required this.isLive,
    required this.requested,
    required this.requesterId,
    required this.streamUrl,
    required this.currentFishCount,
    this.startedAt,
    this.lastPingAt,
    this.requestedAt,
    this.currentClarityScore,
    this.currentTurbidityFnu,
  });

  final String tankId;
  final bool isLive;
  final bool requested;
  final String requesterId;
  final String streamUrl;
  final DateTime? startedAt;
  final DateTime? lastPingAt;
  final DateTime? requestedAt;
  final double? currentClarityScore;
  final double? currentTurbidityFnu;
  final int currentFishCount;
}

class ProductionLiveRequest {
  const ProductionLiveRequest({required this.userId, this.requestedAt});

  final String userId;
  final DateTime? requestedAt;
}
