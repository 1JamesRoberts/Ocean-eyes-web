import 'aquarium_models.dart';
import 'species_catalog.dart';

abstract final class DemoFixtures {
  static const species = SpeciesCatalog.options;

  /// Matches the bundled camera frame byte-for-byte.
  static const heatmapSourceDimensions = DetectionFrameDimensions(
    width: 1380,
    height: 771,
  );

  /// Deterministic detection centers for populated analytics states.
  static const heatmapCenters = <NormalizedDetectionCenter>[
    NormalizedDetectionCenter(nx: 0.15, ny: 0.28, speciesId: 'cardinal_tetra'),
    NormalizedDetectionCenter(nx: 0.28, ny: 0.62, speciesId: 'cardinal_tetra'),
    NormalizedDetectionCenter(nx: 0.46, ny: 0.47, speciesId: 'guppy'),
    NormalizedDetectionCenter(nx: 0.61, ny: 0.36, speciesId: 'corydoras'),
    NormalizedDetectionCenter(nx: 0.72, ny: 0.61, speciesId: 'cherry_barb'),
    NormalizedDetectionCenter(nx: 0.83, ny: 0.27, speciesId: 'guppy'),
    NormalizedDetectionCenter(nx: 0.90, ny: 0.70, speciesId: 'cardinal_tetra'),
  ];

  static List<FishEntry> populatedFish() => const [
    FishEntry(
      id: 'fish-cardinal',
      speciesId: 'cardinal_tetra',
      name: 'Cardinal Tetra',
      scientificName: 'Paracheirodon axelrodi',
      assetPath: 'assets/images/fish/cardinal_tetra.png',
      count: 8,
      detected: 7,
      compatibility: 'Peaceful community fish',
      careLevel: 'Easy',
    ),
    FishEntry(
      id: 'fish-guppy',
      speciesId: 'guppy',
      name: 'Guppy',
      scientificName: 'Poecilia reticulata',
      assetPath: 'assets/images/fish/guppy.png',
      count: 5,
      detected: 5,
      compatibility: 'Peaceful livebearer',
      careLevel: 'Easy',
    ),
    FishEntry(
      id: 'fish-corydoras',
      speciesId: 'corydoras',
      name: 'Corydoras',
      scientificName: 'Corydoras paleatus',
      assetPath: 'assets/images/fish/corydoras.png',
      count: 4,
      detected: 3,
      compatibility: 'Calm bottom dweller',
      careLevel: 'Easy',
    ),
    FishEntry(
      id: 'fish-cherry',
      speciesId: 'cherry_barb',
      name: 'Cherry Barb',
      scientificName: 'Puntius titteya',
      assetPath: 'assets/images/fish/cherry_barb.png',
      count: 3,
      detected: 2,
      compatibility: 'Peaceful schooling fish',
      careLevel: 'Easy',
    ),
  ];

  static const waterMetrics = <WaterMetric>[
    WaterMetric(
      label: 'Temperature',
      value: '26.3',
      unit: '°C',
      status: 'Ideal',
    ),
    WaterMetric(
      label: 'pH Level',
      value: '7.2',
      unit: 'pH',
      status: 'Balanced',
    ),
    WaterMetric(label: 'Turbidity', value: '1.5', unit: 'FNU', status: 'Clear'),
    WaterMetric(label: 'Ammonia', value: '0.00', unit: 'ppm', status: 'Safe'),
    WaterMetric(label: 'Nitrite', value: '0.00', unit: 'ppm', status: 'Safe'),
  ];

  static const warningWaterMetrics = <WaterMetric>[
    WaterMetric(
      label: 'Temperature',
      value: '28.8',
      unit: '°C',
      status: 'High',
      isWarning: true,
    ),
    WaterMetric(label: 'pH Level', value: '7.8', unit: 'pH', status: 'Watch'),
    WaterMetric(
      label: 'Turbidity',
      value: '4.9',
      unit: 'FNU',
      status: 'Cloudy',
      isWarning: true,
    ),
    WaterMetric(
      label: 'Ammonia',
      value: '0.12',
      unit: 'ppm',
      status: 'Watch',
      isWarning: true,
    ),
    WaterMetric(label: 'Nitrite', value: '0.02', unit: 'ppm', status: 'Safe'),
  ];

  static List<AlertItem> alerts() => const [
    AlertItem(
      id: 'alert-turbidity',
      title: 'Water clarity needs attention',
      message: 'Turbidity has risen above your 3.0 FNU threshold.',
      timeLabel: '12 min ago',
      severity: AlertSeverity.warning,
      actionPlan:
          'Inspect the filter and remove visible debris. If clarity keeps '
          'declining, perform a partial water change and scan again.',
    ),
    AlertItem(
      id: 'alert-fish-count',
      title: 'Fish count below expected',
      message: '17 of 20 fish were visible in the latest scan.',
      timeLabel: '38 min ago',
      severity: AlertSeverity.critical,
      actionPlan:
          'Review the latest camera view and check plants, caves, and other '
          'hiding places. Confirm each fish is active and accounted for.',
    ),
    AlertItem(
      id: 'alert-temperature',
      title: 'Temperature restored',
      message: 'Water temperature returned to the preferred range.',
      timeLabel: 'Yesterday, 6:42 PM',
      severity: AlertSeverity.info,
      actionPlan:
          'Continue monitoring the heater and verify that the preferred '
          'temperature range is maintained during the next scan.',
      resolved: true,
    ),
  ];

  static const fishCountSeries = <ChartPoint>[
    ChartPoint('12a', 18),
    ChartPoint('4a', 19),
    ChartPoint('8a', 18),
    ChartPoint('12p', 20),
    ChartPoint('4p', 20),
    ChartPoint('8p', 19),
    ChartPoint('Now', 20),
  ];

  static const spreadSeries = <ChartPoint>[
    ChartPoint('12a', 42),
    ChartPoint('4a', 48),
    ChartPoint('8a', 37),
    ChartPoint('12p', 61),
    ChartPoint('4p', 56),
    ChartPoint('8p', 64),
    ChartPoint('Now', 58),
  ];

  static const claritySeries = <ChartPoint>[
    ChartPoint('12a', 92),
    ChartPoint('4a', 91),
    ChartPoint('8a', 94),
    ChartPoint('12p', 90),
    ChartPoint('4p', 88),
    ChartPoint('8p', 91),
    ChartPoint('Now', 93),
  ];

  static List<HistoryReading> history() => [
    HistoryReading(
      date: DateTime(2026, 7, 31, 10, 42),
      clarity: 1.5,
      fishCount: 20,
      summary: 'Water is clear and all expected fish are present.',
    ),
    HistoryReading(
      date: DateTime(2026, 7, 31, 8, 15),
      clarity: 1.8,
      fishCount: 19,
      summary: 'One fish was outside the camera view.',
    ),
    HistoryReading(
      date: DateTime(2026, 7, 30, 20, 7),
      clarity: 2.1,
      fishCount: 20,
      summary: 'Clarity remained inside the preferred range.',
    ),
    HistoryReading(
      date: DateTime(2026, 7, 30, 14, 33),
      clarity: 3.4,
      fishCount: 18,
      summary: 'Brief feeding activity reduced visibility.',
    ),
  ];
}
