import 'package:shared_preferences/shared_preferences.dart';

/// Persisted aquarium-control preferences, independent of Flutter widgets.
class OceanEyesSettings {
  const OceanEyesSettings({
    this.aiEnabled = true,
    this.showDetections = true,
    this.brightness = 1,
    this.contrast = 1,
    this.saturation = 1,
    this.temperature = 0,
    this.tint = 0,
    this.autoConnect = false,
    this.pollingIntervalMs = 10000,
    this.detectionConfidenceThreshold = 0.35,
    this.speciesConfidenceThreshold = 0.35,
    this.diagnosisMinConfidence = 0.60,
    this.clarityThreshold = 5,
    this.visibleFishThreshold = 50,
    this.ambientBlur = 48,
    this.ambientOpacity = 1,
    this.tankName = 'Living Room Reef',
    this.tankConnected = true,
    this.usingFrontCamera = false,
  });

  final bool aiEnabled;
  final bool showDetections;
  final double brightness;
  final double contrast;
  final double saturation;
  final double temperature;
  final double tint;
  final bool autoConnect;
  final double pollingIntervalMs;
  final double detectionConfidenceThreshold;
  final double speciesConfidenceThreshold;
  final double diagnosisMinConfidence;
  final double clarityThreshold;
  final double visibleFishThreshold;
  final double ambientBlur;
  final double ambientOpacity;
  final String tankName;
  final bool tankConnected;
  final bool usingFrontCamera;
}

abstract interface class OceanEyesSettingsRepository {
  OceanEyesSettings? load();

  Future<void> save(OceanEyesSettings settings);
}

/// SharedPreferences adapter kept in the model layer so the view model only
/// depends on a persistence boundary.
class SharedPreferencesOceanEyesSettingsRepository
    implements OceanEyesSettingsRepository {
  SharedPreferencesOceanEyesSettingsRepository(this._preferences);

  static const _keys = <String>{
    'aiEnabled',
    'showDetections',
    'brightness',
    'contrast',
    'saturation',
    'temperature',
    'tint',
    'autoConnect',
    'pollingIntervalMs',
    'detectionConfidenceThreshold',
    'speciesConfidenceThreshold',
    'diagnosisMinConfidence',
    'clarityThreshold',
    'visibleFishThreshold',
    'ambientBlur',
    'ambientOpacity',
    'tankName',
    'tankConnected',
    'usingFrontCamera',
  };

  final SharedPreferences _preferences;

  @override
  OceanEyesSettings? load() {
    if (!_preferences.getKeys().any(_keys.contains)) return null;
    return OceanEyesSettings(
      aiEnabled: _preferences.getBool('aiEnabled') ?? true,
      showDetections: _preferences.getBool('showDetections') ?? true,
      brightness: _preferences.getDouble('brightness') ?? 1,
      contrast: _preferences.getDouble('contrast') ?? 1,
      saturation: _preferences.getDouble('saturation') ?? 1,
      temperature: _preferences.getDouble('temperature') ?? 0,
      tint: _preferences.getDouble('tint') ?? 0,
      autoConnect: _preferences.getBool('autoConnect') ?? false,
      pollingIntervalMs: _preferences.getDouble('pollingIntervalMs') ?? 10000,
      detectionConfidenceThreshold:
          _preferences.getDouble('detectionConfidenceThreshold') ?? 0.35,
      speciesConfidenceThreshold:
          _preferences.getDouble('speciesConfidenceThreshold') ?? 0.35,
      diagnosisMinConfidence:
          _preferences.getDouble('diagnosisMinConfidence') ?? 0.60,
      clarityThreshold: _preferences.getDouble('clarityThreshold') ?? 5,
      visibleFishThreshold:
          _preferences.getDouble('visibleFishThreshold') ?? 50,
      ambientBlur: _preferences.getDouble('ambientBlur') ?? 48,
      ambientOpacity: _preferences.getDouble('ambientOpacity') ?? 1,
      tankName: _preferences.getString('tankName') ?? 'Living Room Reef',
      tankConnected: _preferences.getBool('tankConnected') ?? true,
      usingFrontCamera: _preferences.getBool('usingFrontCamera') ?? false,
    );
  }

  @override
  Future<void> save(OceanEyesSettings settings) async {
    await Future.wait<void>([
      _preferences.setBool('aiEnabled', settings.aiEnabled),
      _preferences.setBool('showDetections', settings.showDetections),
      _preferences.setDouble('brightness', settings.brightness),
      _preferences.setDouble('contrast', settings.contrast),
      _preferences.setDouble('saturation', settings.saturation),
      _preferences.setDouble('temperature', settings.temperature),
      _preferences.setDouble('tint', settings.tint),
      _preferences.setBool('autoConnect', settings.autoConnect),
      _preferences.setDouble('pollingIntervalMs', settings.pollingIntervalMs),
      _preferences.setDouble(
        'detectionConfidenceThreshold',
        settings.detectionConfidenceThreshold,
      ),
      _preferences.setDouble(
        'speciesConfidenceThreshold',
        settings.speciesConfidenceThreshold,
      ),
      _preferences.setDouble(
        'diagnosisMinConfidence',
        settings.diagnosisMinConfidence,
      ),
      _preferences.setDouble('clarityThreshold', settings.clarityThreshold),
      _preferences.setDouble(
        'visibleFishThreshold',
        settings.visibleFishThreshold,
      ),
      _preferences.setDouble('ambientBlur', settings.ambientBlur),
      _preferences.setDouble('ambientOpacity', settings.ambientOpacity),
      _preferences.setString('tankName', settings.tankName),
      _preferences.setBool('tankConnected', settings.tankConnected),
      _preferences.setBool('usingFrontCamera', settings.usingFrontCamera),
    ]);
  }
}
