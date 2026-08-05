import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:oceaneyes/models/classifiable_species.dart';
import 'package:oceaneyes/models/demo_fixtures.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

void main() {
  const expectedClassifierIds = <String>[
    'angelfish',
    'betta',
    'black_skirt_tetra',
    'cardinal_tetra',
    'cherry_barb',
    'clown_loach',
    'corydoras',
    'discus',
    'dwarf_gourami',
    'german_blue_ram',
    'goldfish',
    'guppy',
    'harlequin_rasbora',
    'molly',
    'neon_tetra',
    'oscar',
    'otocinclus',
    'platy',
    'plecostomus',
    'rummy_nose_tetra',
    'siamese_algae_eater',
    'swordtail',
    'tiger_barb',
    'zebra_danio',
  ];

  const normalizedAssetSizes = <String, int>{
    'angelfish.png': 196050,
    'betta.png': 183045,
    'cardinal_tetra.png': 84140,
    'cherry_barb.png': 98250,
    'clown_loach.png': 106704,
    'corydoras.png': 114133,
    'discus.png': 251359,
    'dwarf_gourami.png': 164972,
    'dwarf_rasbora.png': 84081,
    'german_blue_ram.png': 162925,
    'goldfish.png': 124924,
    'guppy.png': 166373,
    'harlequin_rasbora.png': 93382,
    'molly.png': 101941,
    'neon_tetra.png': 96019,
    'oscar.png': 150045,
    'otocinclus.png': 81266,
    'platy.png': 105133,
    'plecotmus.png': 98615,
    'rummy_nose_tetra.png': 96275,
    'siamese_algae_eater.png': 71235,
    'swordtail.png': 51510,
    'tiger_barb.png': 133196,
    'zebra_danio.png': 87652,
  };

  test('projects exactly one catalog-backed option per classifier class', () {
    final fixtureIds = DemoFixtures.species
        .map((species) => species.id)
        .toList(growable: false);

    expect(ClassifiableSpeciesCatalog.speciesClasses, expectedClassifierIds);
    expect(fixtureIds, expectedClassifierIds);
    expect(fixtureIds.toSet(), hasLength(expectedClassifierIds.length));

    for (final species in DemoFixtures.species) {
      expect(
        File(species.assetPath).existsSync(),
        isTrue,
        reason: 'Missing classifier artwork for ${species.id}',
      );
    }
  });

  test('controller exposes only the classifier projection', () {
    final controller = OceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/?fixture=populated'),
    );
    addTearDown(controller.dispose);

    expect(
      controller.availableSpecies.map((species) => species.id),
      expectedClassifierIds,
    );
  });

  test('retains catalog and legacy aliases while using classifier IDs', () {
    final blackSkirt = DemoFixtures.species.singleWhere(
      (species) => species.id == 'black_skirt_tetra',
    );
    final plecostomus = DemoFixtures.species.singleWhere(
      (species) => species.id == 'plecostomus',
    );

    expect(blackSkirt.name, 'Black Skirt Tetra');
    expect(blackSkirt.catalogId, 'black_widow_tetra');
    expect(blackSkirt.legacyIds, ['black_widow_tetra']);
    expect(plecostomus.assetPath, 'assets/images/fish/plecotmus.png');

    expect(
      ClassifiableSpeciesCatalog.resolveId('black_widow_tetra'),
      'black_skirt_tetra',
    );
    expect(
      ClassifiableSpeciesCatalog.resolveId('golden-dwarf-sucker'),
      'otocinclus',
    );
    expect(ClassifiableSpeciesCatalog.resolveId('southern_platy'), 'platy');
    expect(ClassifiableSpeciesCatalog.resolveId('common_pleco'), 'plecostomus');
    expect(
      ClassifiableSpeciesCatalog.resolveId('green_swordtail'),
      'swordtail',
    );
  });

  test('bundles the exact normalized mobile-deploy PNG pack', () {
    expect(normalizedAssetSizes, hasLength(24));

    for (final entry in normalizedAssetSizes.entries) {
      final file = File('assets/images/fish/${entry.key}');
      expect(file.existsSync(), isTrue, reason: 'Missing ${entry.key}');
      expect(
        file.lengthSync(),
        entry.value,
        reason: 'Unexpected bytes for ${entry.key}',
      );

      final decoded = image.decodePng(file.readAsBytesSync());
      expect(decoded, isNotNull, reason: 'Could not decode ${entry.key}');
      expect(decoded!.width, 512, reason: entry.key);
      expect(decoded.height, 512, reason: entry.key);
    }
  });
}
