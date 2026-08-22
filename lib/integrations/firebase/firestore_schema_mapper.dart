import 'dart:collection';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../models/aquarium_models.dart';
import '../../models/classifiable_species.dart';
import '../../models/production_data.dart';
import '../../models/species_catalog.dart';

class FirestoreDocumentData {
  const FirestoreDocumentData({required this.id, required this.data});

  final String id;
  final Map<String, dynamic> data;
}

/// Explicit compatibility mapping between the deployed Firestore schema and
/// the current presentation/domain models.
class FirestoreSchemaMapper {
  FirestoreSchemaMapper({DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final DateTime Function() _clock;

  ProductionTank tankFromDocument(FirestoreDocumentData document) {
    final data = document.data;
    final thresholds = _map(data['thresholds']);
    final calibration = _map(data['calibration']);

    final explicitFnu = _doubleOrNull(thresholds['turbidity_fnu_max']);
    final explicitScore = _doubleOrNull(thresholds['clarity_min']);
    final fnu =
        explicitFnu ??
        (explicitScore == null
            ? ProductionTankThresholds.defaults.turbidityFnuMax
            : ProductionTankThresholds.fnuFromClarityScore(explicitScore));
    final score =
        explicitScore ??
        (explicitFnu == null
            ? ProductionTankThresholds.defaults.clarityScoreMin
            : ProductionTankThresholds.clarityScoreFromFnu(explicitFnu));

    return ProductionTank(
      id: document.id,
      name: _nonEmptyString(data['name']) ?? 'Unnamed Tank',
      ownerId: _string(data['owner_id']),
      monitorIds: _sortedUniqueStrings(data['monitor_uids']),
      viewerIds: _sortedUniqueStrings(data['viewers']),
      createdAt: dateTimeFromValue(data['created_at']),
      thresholds: ProductionTankThresholds(
        turbidityFnuMax: fnu.clamp(0, double.maxFinite),
        clarityScoreMin: score.clamp(1, 10),
        visibleFishChangePercent:
            (_doubleOrNull(thresholds['fish_change_pct']) ??
                    ProductionTankThresholds.defaults.visibleFishChangePercent)
                .clamp(0, 100),
      ),
      waterLineY: _doubleOrNull(calibration['water_line_y'])?.clamp(0, 1),
      recalibrationRequested: _bool(data['recalibrate_requested']),
    );
  }

  ProductionUser userFromDocument(FirestoreDocumentData document) {
    final tokens = <String>{..._strings(data: document.data['fcm_tokens'])};
    final legacyToken = _nonEmptyString(document.data['fcm_token']);
    if (legacyToken != null) tokens.add(legacyToken);
    return ProductionUser(
      id: document.id,
      tankIds: _sortedUniqueStrings(document.data['tanks']),
      fcmTokens: (tokens.toList()..sort()),
      createdAt: dateTimeFromValue(document.data['created_at']),
      displayName: _nonEmptyString(document.data['display_name']),
      email: _nonEmptyString(document.data['email']),
      photoUrl: _nonEmptyString(document.data['photo_url']),
    );
  }

  FishEntry fishFromDocument(
    FirestoreDocumentData document, {
    bool visible = true,
  }) {
    final data = document.data;
    final legacyName = _nonEmptyString(data['name']);
    final rawSpeciesId =
        _nonEmptyString(data['species_id']) ??
        _idFromName(legacyName ?? 'fish');
    final classifierId = ClassifiableSpeciesCatalog.resolveId(
      _idFromName(rawSpeciesId),
    );
    final metadata = _speciesMetadata(classifierId, rawSpeciesId);
    final count = _integer(data['count'], fallback: 1).clamp(1, 99);
    final detected = _integer(data['detected']).clamp(0, count);

    return FishEntry(
      id: document.id,
      speciesId: classifierId,
      name: metadata?.name ?? legacyName ?? _displayName(classifierId),
      scientificName: metadata?.scientificName ?? '',
      assetPath: metadata?.assetPath ?? '',
      count: count,
      detected: detected,
      compatibility: metadata?.compatibility ?? 'Compatibility unknown',
      careLevel: metadata?.careLevel ?? 'Unknown',
      visible: visible,
    );
  }

  List<FishEntry> fishInventoryFromDocuments(
    Iterable<FirestoreDocumentData> documents,
  ) {
    final fish = documents.map(fishFromDocument).toList();
    fish.sort((left, right) {
      final speciesOrder = left.speciesId.compareTo(right.speciesId);
      return speciesOrder != 0 ? speciesOrder : left.id.compareTo(right.id);
    });
    return List.unmodifiable(fish);
  }

  ProductionReading readingFromDocument(FirestoreDocumentData document) {
    final data = document.data;
    final water = _map(data['water']);
    final chemistry = _map(data['water_chemistry']);
    final clarityScore =
        _doubleOrNull(data['clarity_score']) ?? _doubleOrNull(data['clarity']);
    final dimensions = _frameDimensions(data);

    return ProductionReading(
      id: document.id,
      tankId: _string(data['tank_id']),
      timestamp: dateTimeFromValue(data['timestamp']),
      clarityScore: clarityScore?.clamp(0, 10),
      turbidityFnu: _doubleOrNull(
        data['turbidity_fnu'],
      )?.clamp(0, double.maxFinite),
      fishCount: _integer(data['fish_count']).clamp(0, 1000000),
      fishCountConfidence: (_doubleOrNull(data['fish_count_confidence']) ?? 0)
          .clamp(0, 1),
      speciesDetected: _speciesCounts(data['species_detected']),
      frameUrl: _string(data['frame_url']),
      ph: _firstDouble([data['ph'], chemistry['ph'], water['ph']]),
      temperatureCelsius: _firstDouble([
        data['temperature_c'],
        data['temperature'],
        data['temp'],
        chemistry['temperature_c'],
        chemistry['temperature'],
        water['temperature_c'],
      ]),
      ammoniaPpm: _firstDouble([
        data['ammonia_ppm'],
        data['ammonia'],
        chemistry['ammonia_ppm'],
        chemistry['ammonia'],
        water['ammonia_ppm'],
      ]),
      nitritePpm: _firstDouble([
        data['nitrite_ppm'],
        data['nitrite'],
        chemistry['nitrite_ppm'],
        chemistry['nitrite'],
        water['nitrite_ppm'],
      ]),
      detections: _detections(data['detections']),
      frameDimensions: dimensions,
    );
  }

  List<ProductionReading> readingsFromDocuments(
    Iterable<FirestoreDocumentData> documents, {
    int? limit,
  }) {
    final readings = documents.map(readingFromDocument).toList();
    readings.sort(_newestReadingFirst);
    final bounded = limit == null || limit >= readings.length
        ? readings
        : readings.take(limit).toList();
    return List.unmodifiable(bounded);
  }

  ProductionReadingBundle readingBundleFromDocuments(
    Iterable<FirestoreDocumentData> documents, {
    int? limit,
  }) {
    final readings = readingsFromDocuments(documents, limit: limit);
    return ProductionReadingBundle(
      readings: readings,
      history: historyFromReadings(readings, limit: limit),
      analytics: analyticsFromReadings(readings),
    );
  }

  List<HistoryReading> historyFromReadings(
    Iterable<ProductionReading> source, {
    int? limit,
  }) {
    final readings =
        source.where((reading) => reading.isHistoryReading).toList()
          ..sort(_newestReadingFirst);
    final bounded = limit == null ? readings : readings.take(limit);
    return List.unmodifiable(
      bounded.map(
        (reading) => HistoryReading(
          date: reading.timestamp!,
          clarity: reading.clarityScore!,
          fishCount: reading.fishCount,
          summary: _historySummary(reading),
          ph: reading.ph,
          temp: reading.temperatureCelsius,
        ),
      ),
    );
  }

  ProductionAnalyticsData analyticsFromReadings(
    Iterable<ProductionReading> source,
  ) {
    final readings =
        source.where((reading) => reading.isHistoryReading).toList()
          ..sort(_oldestReadingFirst);
    if (readings.isEmpty) return ProductionAnalyticsData.empty;

    final speciesIds = SplayTreeSet<String>();
    final points = <ProductionAnalyticsPoint>[];
    for (final reading in readings) {
      speciesIds.addAll(reading.speciesDetected.keys);
      points.add(
        ProductionAnalyticsPoint(
          timestamp: reading.timestamp!,
          label: _analyticsLabel(reading.timestamp!),
          clarityPercent: (reading.clarityScore! * 10).clamp(0, 100),
          fishCount: reading.fishCount,
          speciesDetected: reading.speciesDetected,
          detections: reading.detections,
          frameDimensions: reading.frameDimensions,
        ),
      );
    }

    final speciesSeries = <String, List<ChartPoint>>{
      for (final speciesId in speciesIds)
        speciesId: List.unmodifiable(
          points.map(
            (point) => ChartPoint(
              point.label,
              (point.speciesDetected[speciesId] ?? 0).toDouble(),
              timestamp: point.timestamp,
            ),
          ),
        ),
    };
    final latestWithDetections = readings.reversed
        .cast<ProductionReading?>()
        .firstWhere(
          (reading) => reading!.detections.isNotEmpty,
          orElse: () => null,
        );

    return ProductionAnalyticsData(
      points: List.unmodifiable(points),
      claritySeries: List.unmodifiable(
        points.map(
          (point) => ChartPoint(
            point.label,
            point.clarityPercent,
            timestamp: point.timestamp,
          ),
        ),
      ),
      fishCountSeries: List.unmodifiable(
        points.map(
          (point) => ChartPoint(
            point.label,
            point.fishCount.toDouble(),
            timestamp: point.timestamp,
          ),
        ),
      ),
      speciesSeries: Map.unmodifiable(speciesSeries),
      heatmapCenters: latestWithDetections?.detections ?? const [],
      heatmapSourceDimensions: latestWithDetections?.frameDimensions,
    );
  }

  List<WaterMetric> waterMetricsFromReading(ProductionReading reading) {
    final metrics = <WaterMetric>[];
    if (reading.temperatureCelsius case final value?) {
      metrics.add(
        WaterMetric(
          label: 'Temperature',
          value: _decimal(value, digits: 1),
          unit: '°C',
          status: value >= 20 && value <= 28 ? 'Ideal' : 'Watch',
          isWarning: value < 20 || value > 28,
        ),
      );
    }
    if (reading.ph case final value?) {
      metrics.add(
        WaterMetric(
          label: 'pH Level',
          value: _decimal(value, digits: 1),
          unit: 'pH',
          status: value >= 6.5 && value <= 8 ? 'Balanced' : 'Watch',
          isWarning: value < 6.5 || value > 8,
        ),
      );
    }
    // A legacy clarity score is intentionally not substituted here.
    if (reading.turbidityFnu case final value?) {
      metrics.add(
        WaterMetric(
          label: 'Turbidity',
          value: _decimal(value, digits: 1),
          unit: 'FNU',
          status: value <= 3 ? 'Clear' : 'Cloudy',
          isWarning: value > 3,
        ),
      );
    }
    if (reading.ammoniaPpm case final value?) {
      metrics.add(
        WaterMetric(
          label: 'Ammonia',
          value: _decimal(value, digits: 2),
          unit: 'ppm',
          status: value <= 0.02 ? 'Safe' : 'Watch',
          isWarning: value > 0.02,
        ),
      );
    }
    if (reading.nitritePpm case final value?) {
      metrics.add(
        WaterMetric(
          label: 'Nitrite',
          value: _decimal(value, digits: 2),
          unit: 'ppm',
          status: value <= 0.02 ? 'Safe' : 'Watch',
          isWarning: value > 0.02,
        ),
      );
    }
    return List.unmodifiable(metrics);
  }

  ProductionAlert alertFromDocument(FirestoreDocumentData document) {
    final data = document.data;
    final context = _map(data['context']);
    final type = _string(data['type']).trim().toLowerCase();
    final timestamp = dateTimeFromValue(data['timestamp']);
    final message =
        _nonEmptyString(data['message']) ?? 'Aquarium status changed.';
    final actionPlan =
        _nonEmptyString(data['tip']) ??
        _nonEmptyString(data['action_plan']) ??
        'Review the latest tank reading and continue monitoring.';

    return ProductionAlert(
      id: document.id,
      tankId: _string(data['tank_id']),
      type: type,
      timestamp: timestamp,
      snoozedUntil: dateTimeFromValue(data['snoozed_until']),
      item: AlertItem(
        id: document.id,
        title: _alertTitle(type),
        message: message,
        timeLabel: timestamp == null ? '' : _relativeTime(timestamp),
        severity: _severity(data['severity']),
        actionPlan: actionPlan,
        clarityBefore: _scalarString(context['clarity_before']),
        clarityAfter: _scalarString(context['clarity_after']),
        fishBefore: _scalarString(context['fish_count_before']),
        fishAfter: _scalarString(context['fish_count_after']),
        resolved: _bool(data['resolved']),
      ),
    );
  }

  List<ProductionAlert> alertsFromDocuments(
    Iterable<FirestoreDocumentData> documents, {
    int? limit,
  }) {
    final alerts = documents.map(alertFromDocument).toList();
    alerts.sort((left, right) {
      final timeOrder = _compareNullableDateDescending(
        left.timestamp,
        right.timestamp,
      );
      return timeOrder != 0 ? timeOrder : left.id.compareTo(right.id);
    });
    final bounded = limit == null ? alerts : alerts.take(limit);
    return List.unmodifiable(bounded);
  }

  ProductionLiveState liveStateFromDocument(FirestoreDocumentData document) {
    final data = document.data;
    return ProductionLiveState(
      tankId: document.id,
      isLive: _bool(data['is_live']),
      requested: _bool(data['requested']),
      requesterId: _string(data['requester']),
      streamUrl: _string(data['stream_url']),
      startedAt: dateTimeFromValue(data['started_at']),
      lastPingAt: dateTimeFromValue(data['last_ping_at']),
      requestedAt: dateTimeFromValue(data['requested_at']),
      currentClarityScore:
          _doubleOrNull(data['current_clarity_score']) ??
          _doubleOrNull(data['current_clarity']),
      currentTurbidityFnu: _doubleOrNull(data['current_turbidity_fnu']),
      currentFishCount: _integer(data['current_fish_count']).clamp(0, 1000000),
    );
  }

  ProductionLiveRequest liveRequestFromDocument(
    FirestoreDocumentData document,
  ) => ProductionLiveRequest(
    userId: document.id,
    requestedAt: dateTimeFromValue(document.data['requested_at']),
  );

  List<ProductionLiveRequest> liveRequestsFromDocuments(
    Iterable<FirestoreDocumentData> documents,
  ) {
    final requests = documents.map(liveRequestFromDocument).toList();
    requests.sort((left, right) {
      final timeOrder = _compareNullableDateDescending(
        left.requestedAt,
        right.requestedAt,
      );
      return timeOrder != 0 ? timeOrder : left.userId.compareTo(right.userId);
    });
    return List.unmodifiable(requests);
  }

  Map<String, Object?> tankCreateData({
    required String name,
    required String ownerId,
    required Object serverTimestamp,
    ProductionTankThresholds thresholds = ProductionTankThresholds.defaults,
  }) => <String, Object?>{
    'name': name.trim(),
    'owner_id': ownerId,
    'monitor_uids': <String>[ownerId],
    'viewers': <String>[],
    'created_at': serverTimestamp,
    'thresholds': thresholdsData(thresholds),
    'recalibrate_requested': false,
  };

  Map<String, Object?> thresholdsData(ProductionTankThresholds thresholds) =>
      <String, Object?>{
        'turbidity_fnu_max': thresholds.turbidityFnuMax,
        'clarity_min': ProductionTankThresholds.clarityScoreFromFnu(
          thresholds.turbidityFnuMax,
        ),
        'fish_change_pct': thresholds.visibleFishChangePercent,
      };

  Map<String, Object?> readingData(
    ProductionReadingDraft reading, {
    required Object serverTimestamp,
  }) {
    final species = _speciesCounts(reading.speciesDetected);
    final result = <String, Object?>{
      'tank_id': reading.tankId,
      'timestamp': serverTimestamp,
      // Keep the deployed field and add the explicit current field.
      'clarity': reading.clarityScore.clamp(0, 10),
      'clarity_score': reading.clarityScore.clamp(0, 10),
      'fish_count': reading.fishCount.clamp(0, 1000000),
      'fish_count_confidence': reading.fishCountConfidence.clamp(0, 1),
      'species_detected': species,
      'frame_url': reading.frameUrl,
    };
    if (reading.turbidityFnu case final value?) {
      result['turbidity_fnu'] = value.clamp(0, double.maxFinite);
    }
    if (reading.ph case final value?) result['ph'] = value;
    if (reading.temperatureCelsius case final value?) {
      result['temperature_c'] = value;
    }
    if (reading.ammoniaPpm case final value?) result['ammonia_ppm'] = value;
    if (reading.nitritePpm case final value?) result['nitrite_ppm'] = value;
    if (reading.detections.isNotEmpty) {
      result['detections'] = reading.detections
          .map(
            (detection) => <String, Object>{
              'nx': detection.nx.clamp(0, 1),
              'ny': detection.ny.clamp(0, 1),
              'species_id': ClassifiableSpeciesCatalog.resolveId(
                _idFromName(detection.speciesId),
              ),
            },
          )
          .toList(growable: false);
    }
    final dimensions = reading.frameDimensions;
    if (dimensions != null && dimensions.isValid) {
      result['frame_dimensions'] = <String, int>{
        'width': dimensions.width,
        'height': dimensions.height,
      };
    }
    return result;
  }

  Map<String, Object?> fishData(
    ProductionFishDraft fish, {
    required Object serverTimestamp,
  }) => <String, Object?>{
    'tank_id': fish.tankId,
    'species_id': ClassifiableSpeciesCatalog.resolveId(
      _idFromName(fish.speciesId),
    ),
    'name': fish.name.trim(),
    'emoji': fish.emoji,
    'count': fish.count.clamp(1, 99),
    'detected': 0,
    'added_at': serverTimestamp,
    'updated_at': serverTimestamp,
  };

  Map<String, Object?> initialReadingData({
    required String tankId,
    required Object serverTimestamp,
  }) => <String, Object?>{
    'tank_id': tankId,
    'timestamp': serverTimestamp,
    'clarity': 0,
    'clarity_score': 0,
    'fish_count': 0,
    'fish_count_confidence': 0,
    'species_detected': <String, int>{},
    'frame_url': '',
  };

  Map<String, Object?> initialLiveStateData({
    required String publisherId,
    required Object serverTimestamp,
  }) => <String, Object?>{
    'is_live': false,
    'started_at': null,
    'last_ping_at': null,
    'current_clarity': 0,
    'current_turbidity_fnu': null,
    'current_fish_count': 0,
    'publisher_uid': publisherId,
    'updated_at': serverTimestamp,
  };

  DateTime? dateTimeFromValue(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    if (value is num && value.isFinite) {
      final numeric = value.toInt();
      final milliseconds = numeric.abs() < 100000000000
          ? numeric * 1000
          : numeric;
      try {
        return DateTime.fromMillisecondsSinceEpoch(milliseconds);
      } on RangeError {
        return null;
      }
    }
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  SpeciesOption? _speciesMetadata(String classifierId, String rawSpeciesId) {
    for (final option in ClassifiableSpeciesCatalog.options) {
      if (option.id == classifierId) return option;
    }
    final normalizedRaw = _idFromName(rawSpeciesId);
    for (final option in SpeciesCatalog.options) {
      if (option.id == classifierId || option.id == normalizedRaw) {
        return option;
      }
    }
    return null;
  }

  DetectionFrameDimensions? _frameDimensions(Map<String, dynamic> data) {
    final nested = _map(data['frame_dimensions']);
    final width = _integer(
      nested['width'] ?? data['frame_width'],
      fallback: -1,
    );
    final height = _integer(
      nested['height'] ?? data['frame_height'],
      fallback: -1,
    );
    final dimensions = DetectionFrameDimensions(width: width, height: height);
    return dimensions.isValid ? dimensions : null;
  }

  List<NormalizedDetectionCenter> _detections(Object? value) {
    if (value is! Iterable) return const [];
    final result = <NormalizedDetectionCenter>[];
    for (final entry in value) {
      final detection = _map(entry);
      final center = _map(detection['center']);
      final nx = _firstDouble([
        detection['nx'],
        detection['center_x'],
        center['x'],
      ]);
      final ny = _firstDouble([
        detection['ny'],
        detection['center_y'],
        center['y'],
      ]);
      final speciesId = _nonEmptyString(detection['species_id']);
      if (nx == null || ny == null || speciesId == null) continue;
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) continue;
      result.add(
        NormalizedDetectionCenter(
          nx: nx,
          ny: ny,
          speciesId: ClassifiableSpeciesCatalog.resolveId(
            _idFromName(speciesId),
          ),
        ),
      );
    }
    return List.unmodifiable(result);
  }

  Map<String, int> _speciesCounts(Object? value) {
    final raw = _map(value);
    final sorted = SplayTreeMap<String, int>();
    for (final entry in raw.entries) {
      final count = _integer(entry.value);
      if (count <= 0) continue;
      final speciesId = ClassifiableSpeciesCatalog.resolveId(
        _idFromName(entry.key),
      );
      if (speciesId.isEmpty) continue;
      sorted.update(
        speciesId,
        (current) => current + count,
        ifAbsent: () => count,
      );
    }
    return Map.unmodifiable(sorted);
  }

  String _historySummary(ProductionReading reading) {
    if (reading.fishCount == 0) {
      return 'No fish were visible in this reading.';
    }
    if (reading.clarityScore! >= 8) {
      return 'Water clarity was healthy and ${reading.fishCount} fish were visible.';
    }
    if (reading.clarityScore! >= 6) {
      return 'Water clarity remained inside the monitoring range.';
    }
    return 'Water clarity was below the preferred range.';
  }

  String _analyticsLabel(DateTime timestamp) {
    final now = _clock();
    if (timestamp.year == now.year &&
        timestamp.month == now.month &&
        timestamp.day == now.day) {
      final hour = timestamp.hour % 12 == 0 ? 12 : timestamp.hour % 12;
      final suffix = timestamp.hour < 12 ? 'a' : 'p';
      return timestamp.minute == 0
          ? '$hour$suffix'
          : '$hour:${timestamp.minute.toString().padLeft(2, '0')}$suffix';
    }
    return '${timestamp.month}/${timestamp.day}';
  }

  String _relativeTime(DateTime timestamp) {
    final difference = _clock().toUtc().difference(timestamp.toUtc());
    if (difference.isNegative || difference.inMinutes < 1) return 'just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    if (difference.inHours < 48) return 'Yesterday';
    return '${timestamp.month}/${timestamp.day}/${timestamp.year}';
  }

  String _alertTitle(String type) => switch (type) {
    'clarity_low' ||
    'clarity_drop' ||
    'turbidity_high' => 'Water clarity needs attention',
    'fish_zero' => 'No fish visible',
    'fish_drop' || 'fish_count_low' => 'Fish count below expected',
    'temperature_high' ||
    'temperature_low' => 'Water temperature needs attention',
    'daily_report' || 'daily_digest' => 'Daily report',
    _ => 'Aquarium update',
  };

  AlertSeverity _severity(Object? value) =>
      switch (_string(value).toLowerCase()) {
        'critical' || 'high' || 'error' => AlertSeverity.critical,
        'warning' || 'warn' || 'medium' => AlertSeverity.warning,
        _ => AlertSeverity.info,
      };

  int _newestReadingFirst(ProductionReading left, ProductionReading right) {
    final timeOrder = _compareNullableDateDescending(
      left.timestamp,
      right.timestamp,
    );
    return timeOrder != 0 ? timeOrder : left.id.compareTo(right.id);
  }

  int _oldestReadingFirst(ProductionReading left, ProductionReading right) {
    final leftTime = left.timestamp;
    final rightTime = right.timestamp;
    if (leftTime == null && rightTime == null) {
      return left.id.compareTo(right.id);
    }
    if (leftTime == null) return 1;
    if (rightTime == null) return -1;
    final timeOrder = leftTime.compareTo(rightTime);
    return timeOrder != 0 ? timeOrder : left.id.compareTo(right.id);
  }

  int _compareNullableDateDescending(DateTime? left, DateTime? right) {
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return right.compareTo(left);
  }

  Map<String, dynamic> _map(Object? value) {
    if (value is! Map) return const {};
    return <String, dynamic>{
      for (final entry in value.entries)
        if (entry.key is String) entry.key as String: entry.value,
    };
  }

  List<String> _sortedUniqueStrings(Object? value) {
    final result = _strings(data: value).toSet().toList()..sort();
    return List.unmodifiable(result);
  }

  Iterable<String> _strings({required Object? data}) sync* {
    if (data is! Iterable) return;
    for (final value in data) {
      final string = _nonEmptyString(value);
      if (string != null) yield string;
    }
  }

  double? _firstDouble(Iterable<Object?> values) {
    for (final value in values) {
      final number = _doubleOrNull(value);
      if (number != null) return number;
    }
    return null;
  }

  double? _doubleOrNull(Object? value) {
    final number = switch (value) {
      num value => value.toDouble(),
      String value => double.tryParse(value.trim()),
      _ => null,
    };
    return number != null && number.isFinite ? number : null;
  }

  int _integer(Object? value, {int fallback = 0}) {
    final number = _doubleOrNull(value);
    return number?.round() ?? fallback;
  }

  bool _bool(Object? value) => switch (value) {
    true || 1 || 'true' || '1' => true,
    _ => false,
  };

  String _string(Object? value) => value is String ? value : '';

  String? _nonEmptyString(Object? value) {
    final string = _string(value).trim();
    return string.isEmpty ? null : string;
  }

  String _scalarString(Object? value) {
    if (value is num) {
      final number = value.toDouble();
      return number == number.roundToDouble()
          ? number.toInt().toString()
          : number.toStringAsFixed(1);
    }
    return value is String ? value : '';
  }

  String _decimal(double value, {required int digits}) {
    return value.toStringAsFixed(digits);
  }

  String _idFromName(String value) => value
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
      .replaceAll(RegExp(r'^_+|_+$'), '');

  String _displayName(String id) => id
      .split('_')
      .where((part) => part.isNotEmpty)
      .map(
        (part) => '${part.substring(0, 1).toUpperCase()}${part.substring(1)}',
      )
      .join(' ');
}
