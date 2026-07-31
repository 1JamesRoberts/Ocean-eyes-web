import 'aquarium_models.dart';

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
  static SpeciesFacts? factsFor(String speciesId) => _speciesFacts[speciesId];

  static List<FishCompatibility> compatibilitiesFor(
    Iterable<FishEntry> tankFish,
    String fishId,
  ) {
    final entries = tankFish.toList(growable: false);
    FishEntry? selected;
    for (final entry in entries) {
      if (entry.id == fishId) {
        selected = entry;
        break;
      }
    }
    if (selected == null) return const [];
    final selectedFacts = factsFor(selected.speciesId);
    final result = entries
        .where((entry) => entry.id != fishId)
        .map(
          (entry) => FishCompatibility(
            fish: entry,
            score: pairCompatibility(selectedFacts, factsFor(entry.speciesId)),
          ),
        )
        .toList(growable: false);
    result.sort((first, second) {
      final firstScore = first.score;
      final secondScore = second.score;
      if (firstScore == null && secondScore == null) {
        return first.fish.name.compareTo(second.fish.name);
      }
      if (firstScore == null) return 1;
      if (secondScore == null) return -1;
      final scoreOrder = firstScore.compareTo(secondScore);
      return scoreOrder == 0
          ? first.fish.name.compareTo(second.fish.name)
          : scoreOrder;
    });
    return result;
  }

  static TankStats tankStats(Iterable<FishEntry> fish) {
    final entries = fish.toList(growable: false);
    final mappedFacts = entries
        .map((entry) => factsFor(entry.speciesId))
        .toList(growable: false);
    final facts = mappedFacts.whereType<SpeciesFacts>().toList(growable: false);
    if (facts.isEmpty) {
      return const TankStats(
        idealTankLitres: null,
        temperatureRange: '—',
        phRange: '—',
        compatibility: null,
      );
    }

    final idealTank = facts
        .map((item) => item.tankLitres)
        .reduce((a, b) => a > b ? a : b);
    final temperature = _intersect(
      facts.map((item) => (item.tempMin, item.tempMax)).toList(),
      unit: '°C',
    );
    final ph = _intersect(
      facts.map((item) => (item.phMin, item.phMax)).toList(),
    );

    var total = 0;
    var pairs = 0;
    for (var first = 0; first < facts.length; first += 1) {
      for (var second = first + 1; second < facts.length; second += 1) {
        final score = pairCompatibility(facts[first], facts[second]);
        if (score != null) {
          total += score;
          pairs += 1;
        }
      }
    }
    return TankStats(
      idealTankLitres: idealTank,
      temperatureRange: temperature,
      phRange: ph,
      compatibility: mappedFacts.any((facts) => facts == null)
          ? null
          : pairs == 0
          ? 100
          : (total / pairs).round(),
    );
  }

  static int? pairCompatibility(SpeciesFacts? first, SpeciesFacts? second) {
    if (first == null || second == null) return null;
    var score = 100;
    final temperatureOverlap =
        (first.tempMax < second.tempMax ? first.tempMax : second.tempMax) -
        (first.tempMin > second.tempMin ? first.tempMin : second.tempMin);
    if (temperatureOverlap <= 0) return 0;
    if (temperatureOverlap < 3) {
      score -= 40;
    } else if (temperatureOverlap < 5) {
      score -= 20;
    }

    final phOverlap =
        (first.phMax < second.phMax ? first.phMax : second.phMax) -
        (first.phMin > second.phMin ? first.phMin : second.phMin);
    if (phOverlap <= 0) return 0;
    if (phOverlap < 0.5) {
      score -= 30;
    } else if (phOverlap < 1) {
      score -= 15;
    }

    final aggressions = {first.aggression, second.aggression};
    if (aggressions.contains('aggressive') &&
        aggressions.contains('peaceful')) {
      score -= 25;
    } else if (aggressions.contains('aggressive') &&
        aggressions.contains('mostly_peaceful')) {
      score -= 15;
    } else if (aggressions.contains('mostly_peaceful') &&
        aggressions.contains('peaceful')) {
      score -= 5;
    }
    if ((first.behavior == 'solitary' && second.behavior == 'schooling') ||
        (first.behavior == 'schooling' && second.behavior == 'solitary')) {
      score -= 10;
    }
    return score.clamp(0, 100);
  }

  static String _intersect(List<(double, double)> ranges, {String unit = ''}) {
    var low = ranges.first.$1;
    var high = ranges.first.$2;
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
