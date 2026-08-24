enum PrimaryTab { dashboard, myFish, analytics, account }

enum SecondaryRoute { alerts, history }

enum AppPage { primary, alerts, alertDetail, history }

enum DashboardHealthState { waiting, healthy, warning }

enum AnalyticsContentState { loading, empty, error, populated }

enum CameraStage {
  beforePermission,
  requestingPermission,
  denied,
  unavailable,
  idle,
  active,
  aiProcessing,
  measuringTurbidity,
}

enum AlertSeverity { info, warning, critical }

/// A detection center expressed in normalized source-image coordinates.
///
/// Keeping this type free of Flutter geometry classes lets inference/history
/// data remain in the model layer while views choose how to project it.
class NormalizedDetectionCenter {
  const NormalizedDetectionCenter({
    required this.nx,
    required this.ny,
    required this.speciesId,
  });

  final double nx;
  final double ny;
  final String speciesId;

  @override
  bool operator ==(Object other) =>
      other is NormalizedDetectionCenter &&
      other.nx == nx &&
      other.ny == ny &&
      other.speciesId == speciesId;

  @override
  int get hashCode => Object.hash(nx, ny, speciesId);
}

/// Pixel dimensions of the image on which normalized detections were made.
class DetectionFrameDimensions {
  const DetectionFrameDimensions({required this.width, required this.height});

  final int width;
  final int height;

  bool get isValid => width > 0 && height > 0;

  @override
  bool operator ==(Object other) =>
      other is DetectionFrameDimensions &&
      other.width == width &&
      other.height == height;

  @override
  int get hashCode => Object.hash(width, height);
}

class FishEntry {
  const FishEntry({
    required this.id,
    required this.speciesId,
    required this.name,
    required this.scientificName,
    required this.assetPath,
    required this.count,
    required this.detected,
    required this.compatibility,
    required this.careLevel,
    this.visible = true,
  });

  final String id;
  final String speciesId;
  final String name;
  final String scientificName;
  final String assetPath;
  final int count;
  final int detected;
  final String compatibility;
  final String careLevel;
  final bool visible;

  double get visibility => count == 0 ? 0 : (detected / count).clamp(0, 1);

  FishEntry copyWith({int? count, int? detected, bool? visible}) {
    return FishEntry(
      id: id,
      speciesId: speciesId,
      name: name,
      scientificName: scientificName,
      assetPath: assetPath,
      count: count ?? this.count,
      detected: detected ?? this.detected,
      compatibility: compatibility,
      careLevel: careLevel,
      visible: visible ?? this.visible,
    );
  }
}

class SpeciesOption {
  const SpeciesOption({
    required this.id,
    required this.name,
    required this.scientificName,
    required this.assetPath,
    required this.compatibility,
    required this.careLevel,
    this.altName = '',
    this.creatureType = 'fish',
    this.initials = '',
    this.catalogId,
    this.legacyIds = const [],
  });

  final String id;
  final String name;
  final String scientificName;
  final String assetPath;
  final String compatibility;
  final String careLevel;
  final String altName;
  final String creatureType;
  final String initials;
  final String? catalogId;
  final List<String> legacyIds;
}

class WaterMetric {
  const WaterMetric({
    required this.label,
    required this.value,
    required this.unit,
    required this.status,
    this.isWarning = false,
  });

  final String label;
  final String value;
  final String unit;
  final String status;
  final bool isWarning;
}

class AlertItem {
  const AlertItem({
    required this.id,
    required this.title,
    required this.message,
    required this.timeLabel,
    required this.severity,
    required this.actionPlan,
    this.clarityBefore = '',
    this.clarityAfter = '',
    this.fishBefore = '',
    this.fishAfter = '',
    this.resolved = false,
  });

  final String id;
  final String title;
  final String message;
  final String timeLabel;
  final AlertSeverity severity;
  final String actionPlan;
  final String clarityBefore;
  final String clarityAfter;
  final String fishBefore;
  final String fishAfter;
  final bool resolved;

  AlertItem copyWith({bool? resolved}) => AlertItem(
    id: id,
    title: title,
    message: message,
    timeLabel: timeLabel,
    severity: severity,
    actionPlan: actionPlan,
    clarityBefore: clarityBefore,
    clarityAfter: clarityAfter,
    fishBefore: fishBefore,
    fishAfter: fishAfter,
    resolved: resolved ?? this.resolved,
  );
}

class ChartPoint {
  const ChartPoint(this.label, this.value, {this.timestamp});

  final String label;
  final double value;
  final DateTime? timestamp;
}

class FishDiagnostic {
  const FishDiagnostic({
    required this.fish,
    required this.status,
    required this.confidence,
    required this.scannedAt,
    required this.observation,
  });

  final FishEntry fish;
  final String status;
  final int confidence;
  final DateTime scannedAt;
  final String observation;
}

class HistoryReading {
  const HistoryReading({
    required this.date,
    required this.clarity,
    required this.fishCount,
    required this.summary,
    this.ph,
    this.temp,
  });

  final DateTime date;
  final double clarity;
  final int fishCount;
  final String summary;
  final double? ph;
  final double? temp;
}
