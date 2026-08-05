import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/models/fish_insights_service.dart';
import 'package:oceaneyes/models/species_catalog.dart';

void main() {
  test('bundles the complete mobile-ui species catalog and imagery', () {
    expect(SpeciesCatalog.options, hasLength(541));
    expect(SpeciesCatalog.options.first.name, "Adolfo's cory");
    expect(SpeciesCatalog.options.first.scientificName, 'Corydoras adolfoi');

    for (final species in SpeciesCatalog.options) {
      expect(
        File(species.assetPath).existsSync(),
        isTrue,
        reason: 'Missing image for ${species.id}: ${species.assetPath}',
      );
      expect(SpeciesCatalog.facts[species.id], isNotNull);
      expect(SpeciesCatalog.colorValues[species.id], isNotNull);
    }
  });

  test('an empty tank is trivially compatible like mobile-ui', () {
    expect(FishInsightsService.tankStats(const []).compatibility, 100);
  });
}
