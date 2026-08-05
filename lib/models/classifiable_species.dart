import 'aquarium_models.dart';
import 'species_catalog.dart';

/// The inventory species exposed by the deployed AI classifier.
///
/// This projection intentionally remains separate from [SpeciesCatalog],
/// which contains the much larger reference catalog used for species facts.
abstract final class ClassifiableSpeciesCatalog {
  static const speciesClasses = <String>[
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

  static const _catalogIdByClassifierId = <String, String>{
    'black_skirt_tetra': 'black_widow_tetra',
  };

  static const _legacyIdsByClassifierId = <String, List<String>>{
    'black_skirt_tetra': ['black_widow_tetra'],
    'otocinclus': ['golden_dwarf_sucker'],
    'platy': ['southern_platy'],
    'plecostomus': ['common_pleco'],
    'swordtail': ['green_swordtail'],
  };

  static final List<SpeciesOption> options = List.unmodifiable(
    speciesClasses.map(_projectCatalogSpecies),
  );

  static final Map<String, String> _classifierIdByAlias = {
    for (final species in options) ...{
      _normalizeId(species.id): species.id,
      _normalizeId(species.catalogId ?? species.id): species.id,
      for (final legacyId in species.legacyIds)
        _normalizeId(legacyId): species.id,
    },
  };

  /// Resolves classifier, catalog, and legacy IDs to the classifier ID.
  ///
  /// Unknown IDs are normalized and returned unchanged, matching the web app.
  static String resolveId(String id) {
    final normalized = _normalizeId(id);
    return _classifierIdByAlias[normalized] ?? normalized;
  }

  static SpeciesOption _projectCatalogSpecies(String classifierId) {
    final catalogId = _catalogIdByClassifierId[classifierId] ?? classifierId;
    final catalogSpecies = SpeciesCatalog.options.firstWhere(
      (species) => species.id == catalogId,
      orElse: () => throw StateError(
        'Missing catalog entry for AI species class: $classifierId',
      ),
    );

    return SpeciesOption(
      id: classifierId,
      name: _displayClassName(classifierId),
      scientificName: catalogSpecies.scientificName,
      assetPath: catalogSpecies.assetPath,
      compatibility: catalogSpecies.compatibility,
      careLevel: catalogSpecies.careLevel,
      altName: catalogSpecies.altName,
      creatureType: catalogSpecies.creatureType,
      initials: catalogSpecies.initials,
      catalogId: catalogId,
      legacyIds: _legacyIdsByClassifierId[classifierId] ?? const [],
    );
  }

  static String _displayClassName(String id) => id
      .split('_')
      .map(
        (word) => word.isEmpty
            ? word
            : '${word.substring(0, 1).toUpperCase()}${word.substring(1)}',
      )
      .join(' ');

  static String _normalizeId(String id) =>
      id.toLowerCase().trim().replaceAll('-', '_');
}
