import 'aquarium_models.dart';
import 'species_catalog.dart';

class TankStats {
  const TankStats({
    required this.idealTankLitres,
    required this.temperatureRange,
    required this.phRange,
    required this.compatibility,
  });

  final int? idealTankLitres;
  final String temperatureRange;
  final String phRange;
  final int? compatibility;
}

class SpeciesFacts {
  const SpeciesFacts({
    required this.sizeCm,
    required this.tankLitres,
    required this.tempMin,
    required this.tempMax,
    required this.phMin,
    required this.phMax,
    required this.availability,
    required this.aggression,
    required this.aggressionLabel,
    required this.behavior,
    required this.behaviorLabel,
    required this.swimZone,
  });

  SpeciesFacts._fromCatalog(SpeciesCatalogFacts facts)
    : sizeCm = facts.sizeCm,
      tankLitres = facts.tankLitres,
      tempMin = facts.tempMin,
      tempMax = facts.tempMax,
      phMin = facts.phMin,
      phMax = facts.phMax,
      availability = facts.availability,
      aggression = facts.aggression,
      aggressionLabel = facts.aggressionLabel,
      behavior = facts.behavior,
      behaviorLabel = facts.behaviorLabel,
      swimZone = facts.swimZone;

  final double sizeCm;
  final int tankLitres;
  final double tempMin;
  final double tempMax;
  final double phMin;
  final double phMax;
  final String availability;
  final String aggression;
  final String aggressionLabel;
  final String behavior;
  final String behaviorLabel;
  final String swimZone;
}

class FishCompatibility {
  const FishCompatibility({required this.fish, required this.score});

  final FishEntry fish;
  final int? score;
}

/// Pure aquarium compatibility and care calculations shared by view models.
abstract final class FishInsightsService {
  static SpeciesFacts? factsFor(String speciesId) {
    final fixtureFacts = _speciesFacts[speciesId];
    if (fixtureFacts != null) return fixtureFacts;
    final catalogFacts = SpeciesCatalog.facts[speciesId];
    return catalogFacts == null
        ? null
        : SpeciesFacts._fromCatalog(catalogFacts);
  }

  static List<FishCompatibility> compatibilitiesFor(
    Iterable<FishEntry> tankFish,
    String fishId,
  ) {
    final entries = tankFish.toList(growable: false);
    final selectedIndex = entries.indexWhere((entry) => entry.id == fishId);
    if (selectedIndex < 0) return const [];
    final selectedFacts = factsFor(entries[selectedIndex].speciesId);
    final result = entries
        .where((entry) => entry.id != fishId)
        .map(
          (entry) => FishCompatibility(
            fish: entry,
            score: pairCompatibility(selectedFacts, factsFor(entry.speciesId)),
          ),
        )
        .toList(growable: false);
    result.sort(_compareCompatibility);
    return result;
  }

  static TankStats tankStats(Iterable<FishEntry> fish) {
    final entries = fish.toList(growable: false);
    final facts = entries
        .map((entry) => factsFor(entry.speciesId))
        .whereType<SpeciesFacts>()
        .toList(growable: false);
    if (facts.isEmpty) {
      return TankStats(
        idealTankLitres: null,
        temperatureRange: '—',
        phRange: '—',
        compatibility: entries.isEmpty ? 100 : null,
      );
    }

    final idealTank = facts
        .map((item) => item.tankLitres)
        .reduce((first, second) => first > second ? first : second);
    final temperature = _intersect(
      facts.map((item) => (item.tempMin, item.tempMax)),
      unit: '°C',
    );
    final ph = _intersect(facts.map((item) => (item.phMin, item.phMax)));
    var total = 0, pairs = 0;
    for (var first = 0; first < facts.length; first += 1) {
      for (var second = first + 1; second < facts.length; second += 1) {
        total += pairCompatibility(facts[first], facts[second])!;
        pairs += 1;
      }
    }
    final compatibility = facts.length != entries.length
        ? null
        : pairs == 0
        ? 100
        : (total / pairs).round();
    return TankStats(
      idealTankLitres: idealTank,
      temperatureRange: temperature,
      phRange: ph,
      compatibility: compatibility,
    );
  }

  static int? pairCompatibility(SpeciesFacts? first, SpeciesFacts? second) {
    if (first == null || second == null) return null;
    final temperatureOverlap =
        (first.tempMax < second.tempMax ? first.tempMax : second.tempMax) -
        (first.tempMin > second.tempMin ? first.tempMin : second.tempMin);
    if (temperatureOverlap <= 0) return 0;
    var score = 100;
    score -= temperatureOverlap < 3
        ? 40
        : temperatureOverlap < 5
        ? 20
        : 0;

    final phOverlap =
        (first.phMax < second.phMax ? first.phMax : second.phMax) -
        (first.phMin > second.phMin ? first.phMin : second.phMin);
    if (phOverlap <= 0) return 0;
    score -= phOverlap < 0.5
        ? 30
        : phOverlap < 1
        ? 15
        : 0;
    final aggressions = (first.aggression, second.aggression);
    score -= switch ((
      aggressions.$1 == 'aggressive' || aggressions.$2 == 'aggressive',
      aggressions.$1 == 'peaceful' || aggressions.$2 == 'peaceful',
      aggressions.$1 == 'mostly_peaceful' ||
          aggressions.$2 == 'mostly_peaceful',
    )) {
      (true, true, _) => 25,
      (true, false, true) => 15,
      (false, true, true) => 5,
      _ => 0,
    };
    if ((first.behavior == 'solitary' && second.behavior == 'schooling') ||
        (first.behavior == 'schooling' && second.behavior == 'solitary')) {
      score -= 10;
    }
    return score.clamp(0, 100);
  }

  static int _compareCompatibility(
    FishCompatibility first,
    FishCompatibility second,
  ) {
    const unknownScore = 101;
    final scoreOrder = (first.score ?? unknownScore).compareTo(
      second.score ?? unknownScore,
    );
    return scoreOrder == 0
        ? first.fish.name.compareTo(second.fish.name)
        : scoreOrder;
  }

  static String _intersect(
    Iterable<(double, double)> ranges, {
    String unit = '',
  }) {
    final first = ranges.first;
    var low = first.$1;
    var high = first.$2;
    for (final range in ranges.skip(1)) {
      if (range.$1 > low) low = range.$1;
      if (range.$2 < high) high = range.$2;
    }
    if (low > high) {
      low = ranges.map((range) => range.$1).reduce((a, b) => a < b ? a : b);
      high = ranges.map((range) => range.$2).reduce((a, b) => a > b ? a : b);
    }
    return '${_number(low)}–${_number(high)}${unit.isEmpty ? '' : ' $unit'}';
  }

  static String _number(double value) => value == value.roundToDouble()
      ? value.round().toString()
      : value.toStringAsFixed(value * 10 == (value * 10).round() ? 1 : 2);

  static const _speciesFacts = <String, SpeciesFacts>{
    'cardinal_tetra': SpeciesFacts(
      sizeCm: 4.5,
      tankLitres: 60,
      tempMin: 23,
      tempMax: 29,
      phMin: 5,
      phMax: 7,
      availability: 'Very Common',
      aggression: 'peaceful',
      aggressionLabel: 'Peaceful',
      behavior: 'schooling',
      behaviorLabel: 'Schooling',
      swimZone: 'Middle',
    ),
    'guppy': SpeciesFacts(
      sizeCm: 6,
      tankLitres: 50,
      tempMin: 18,
      tempMax: 28,
      phMin: 6.8,
      phMax: 7.8,
      availability: 'Very Common',
      aggression: 'peaceful',
      aggressionLabel: 'Peaceful',
      behavior: 'social',
      behaviorLabel: 'Social',
      swimZone: 'Middle',
    ),
    'corydoras': SpeciesFacts(
      sizeCm: 7.5,
      tankLitres: 75,
      tempMin: 21,
      tempMax: 27,
      phMin: 6,
      phMax: 7.5,
      availability: 'Very Common',
      aggression: 'peaceful',
      aggressionLabel: 'Peaceful',
      behavior: 'schooling',
      behaviorLabel: 'Schooling',
      swimZone: 'Bottom',
    ),
    'cherry_barb': SpeciesFacts(
      sizeCm: 5,
      tankLitres: 75,
      tempMin: 22,
      tempMax: 27,
      phMin: 6,
      phMax: 8,
      availability: 'Very Common',
      aggression: 'peaceful',
      aggressionLabel: 'Peaceful',
      behavior: 'schooling',
      behaviorLabel: 'Schooling',
      swimZone: 'Middle',
    ),
    'neon_tetra': SpeciesFacts(
      sizeCm: 3.75,
      tankLitres: 40,
      tempMin: 21,
      tempMax: 25,
      phMin: 5,
      phMax: 7.5,
      availability: 'Very Common',
      aggression: 'peaceful',
      aggressionLabel: 'Peaceful',
      behavior: 'schooling',
      behaviorLabel: 'Schooling',
      swimZone: 'Middle',
    ),
    'dwarf_gourami': SpeciesFacts(
      sizeCm: 7.5,
      tankLitres: 60,
      tempMin: 22,
      tempMax: 27,
      phMin: 6,
      phMax: 7.5,
      availability: 'Common',
      aggression: 'peaceful',
      aggressionLabel: 'Peaceful',
      behavior: 'social',
      behaviorLabel: 'Social',
      swimZone: 'Middle',
    ),
    'angelfish': SpeciesFacts(
      sizeCm: 15,
      tankLitres: 115,
      tempMin: 24,
      tempMax: 30,
      phMin: 6,
      phMax: 7.5,
      availability: 'Very Common',
      aggression: 'mostly_peaceful',
      aggressionLabel: 'Mostly Peaceful',
      behavior: 'social',
      behaviorLabel: 'Social',
      swimZone: 'Middle',
    ),
    'betta': SpeciesFacts(
      sizeCm: 7.5,
      tankLitres: 25,
      tempMin: 22,
      tempMax: 30,
      phMin: 6,
      phMax: 7.5,
      availability: 'Very Common',
      aggression: 'mostly_peaceful',
      aggressionLabel: 'Mostly Peaceful',
      behavior: 'solitary',
      behaviorLabel: 'Solitary',
      swimZone: 'Middle',
    ),
  };
}
