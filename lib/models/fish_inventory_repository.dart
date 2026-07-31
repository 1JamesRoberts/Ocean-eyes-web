import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'aquarium_models.dart';
import 'demo_fixtures.dart';

/// Model-layer persistence boundary for the user's complete fish inventory.
abstract interface class FishInventoryRepository {
  /// Returns `null` when no inventory has been persisted yet.
  ///
  /// An empty list is a valid saved inventory and must remain distinguishable
  /// from a first launch.
  List<FishEntry>? load();

  Future<void> save(List<FishEntry> fish);
}

/// JSON-backed inventory persistence using the app's SharedPreferences store.
class SharedPreferencesFishInventoryRepository
    implements FishInventoryRepository {
  SharedPreferencesFishInventoryRepository(this._preferences);

  static const storageKey = 'fishInventory.v1';
  static const _legacyCountsKey = 'fishCounts';

  final SharedPreferences _preferences;

  @override
  List<FishEntry>? load() {
    final encoded = _preferences.getString(storageKey);
    if (encoded == null) return _loadLegacyCounts();

    try {
      final decoded = jsonDecode(encoded);
      if (decoded is! List) return null;
      return decoded
          .map(
            (value) => _fishFromJson(Map<String, Object?>.from(value as Map)),
          )
          .toList(growable: false);
    } on FormatException {
      return null;
    } on TypeError {
      return null;
    }
  }

  @override
  Future<void> save(List<FishEntry> fish) async {
    final encoded = jsonEncode(fish.map(_fishToJson).toList(growable: false));
    await _preferences.setString(storageKey, encoded);
    await _preferences.remove(_legacyCountsKey);
  }

  List<FishEntry>? _loadLegacyCounts() {
    final counts = _preferences.getStringList(_legacyCountsKey);
    if (counts == null) return null;

    final parsed = <String, int>{};
    for (final item in counts) {
      final separator = item.lastIndexOf(':');
      if (separator <= 0 || separator == item.length - 1) continue;
      final count = int.tryParse(item.substring(separator + 1));
      if (count != null) parsed[item.substring(0, separator)] = count;
    }

    return DemoFixtures.populatedFish()
        .map((entry) {
          final persistedCount = parsed[entry.speciesId];
          if (persistedCount == null) return entry;
          final count = persistedCount.clamp(1, 99);
          return entry.copyWith(
            count: count,
            detected: entry.detected.clamp(0, count),
          );
        })
        .toList(growable: false);
  }

  static Map<String, Object?> _fishToJson(FishEntry fish) => {
    'id': fish.id,
    'speciesId': fish.speciesId,
    'name': fish.name,
    'scientificName': fish.scientificName,
    'assetPath': fish.assetPath,
    'count': fish.count,
    'detected': fish.detected,
    'compatibility': fish.compatibility,
    'careLevel': fish.careLevel,
    'visible': fish.visible,
  };

  static FishEntry _fishFromJson(Map<String, Object?> json) {
    final count = _requiredInt(json, 'count').clamp(1, 99);
    final detected = _requiredInt(json, 'detected').clamp(0, count);
    return FishEntry(
      id: _requiredString(json, 'id'),
      speciesId: _requiredString(json, 'speciesId'),
      name: _requiredString(json, 'name'),
      scientificName: _requiredString(json, 'scientificName'),
      assetPath: _requiredString(json, 'assetPath'),
      count: count,
      detected: detected,
      compatibility: _requiredString(json, 'compatibility'),
      careLevel: _requiredString(json, 'careLevel'),
      visible: json['visible'] is bool ? json['visible']! as bool : true,
    );
  }

  static String _requiredString(Map<String, Object?> json, String key) {
    final value = json[key];
    if (value is! String) throw const FormatException('Invalid fish entry');
    return value;
  }

  static int _requiredInt(Map<String, Object?> json, String key) {
    final value = json[key];
    if (value is! num) throw const FormatException('Invalid fish entry');
    return value.toInt();
  }
}
