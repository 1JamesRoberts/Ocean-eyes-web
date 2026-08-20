import '../models/aquarium_models.dart';
import '../models/fish_inventory_repository.dart';
import '../models/oceaneyes_settings_repository.dart';

/// Serializes local inventory and settings writes independently.
///
/// Callers provide immutable snapshots, so a later UI mutation cannot alter an
/// already queued write.
class OceanEyesPersistenceCoordinator {
  OceanEyesPersistenceCoordinator({
    FishInventoryRepository? inventoryRepository,
    OceanEyesSettingsRepository? settingsRepository,
  }) : _inventoryRepository = inventoryRepository,
       _settingsRepository = settingsRepository;

  final FishInventoryRepository? _inventoryRepository;
  final OceanEyesSettingsRepository? _settingsRepository;

  Future<void> _inventoryWriteQueue = Future<void>.value();
  Future<void> _settingsWriteQueue = Future<void>.value();

  OceanEyesPersistenceSnapshot load() => OceanEyesPersistenceSnapshot(
    fish: _inventoryRepository?.load(),
    settings: _settingsRepository?.load(),
  );

  void save({
    required List<FishEntry> fish,
    required OceanEyesSettings settings,
  }) {
    final inventoryRepository = _inventoryRepository;
    if (inventoryRepository != null) {
      final snapshot = List<FishEntry>.unmodifiable(fish);
      _inventoryWriteQueue = _inventoryWriteQueue.then(
        (_) => inventoryRepository.save(snapshot),
      );
    }

    final settingsRepository = _settingsRepository;
    if (settingsRepository != null) {
      _settingsWriteQueue = _settingsWriteQueue.then(
        (_) => settingsRepository.save(settings),
      );
    }
  }

  Future<void> flush() =>
      Future.wait([_inventoryWriteQueue, _settingsWriteQueue]);
}

class OceanEyesPersistenceSnapshot {
  const OceanEyesPersistenceSnapshot({this.fish, this.settings});

  final List<FishEntry>? fish;
  final OceanEyesSettings? settings;
}
