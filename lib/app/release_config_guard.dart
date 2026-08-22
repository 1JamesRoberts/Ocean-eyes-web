/// Pure validation rules for customer release Dart defines.
///
/// This library intentionally has no Flutter or file-system dependency. The
/// release command and the application composition root use the same rules so
/// a CI check cannot accidentally drift from the runtime check.
enum OceanEyesReleaseTarget { all, web, android, ios }

final class OceanEyesReleaseConfigGuard {
  const OceanEyesReleaseConfigGuard._();

  static const productionDefine = 'OCEANEYES_PRODUCTION';
  static const appCheckDefine = 'OCEANEYES_APP_CHECK';
  static const appCheckDebugDefine = 'OCEANEYES_APP_CHECK_DEBUG';
  static const firebaseEmulatorsDefine = 'OCEANEYES_FIREBASE_EMULATORS';

  static const _coreRequired = <String>[
    'OCEANEYES_FIREBASE_API_KEY',
    'OCEANEYES_FIREBASE_PROJECT_ID',
    'OCEANEYES_FIREBASE_MESSAGING_SENDER_ID',
  ];

  static const _webRequired = <String>[
    'OCEANEYES_FIREBASE_WEB_APP_ID',
    'OCEANEYES_FIREBASE_AUTH_DOMAIN',
    'OCEANEYES_FIREBASE_WEB_PUSH_VAPID_KEY',
    'OCEANEYES_GOOGLE_WEB_CLIENT_ID',
  ];

  static const _androidRequired = <String>[
    'OCEANEYES_FIREBASE_ANDROID_APP_ID',
    'OCEANEYES_GOOGLE_WEB_CLIENT_ID',
  ];

  static const _iosRequired = <String>[
    'OCEANEYES_FIREBASE_IOS_APP_ID',
    'OCEANEYES_FIREBASE_IOS_CLIENT_ID',
  ];

  /// Returns every problem found in [defines]. An empty list means that the
  /// supplied values are safe to pass to a customer release build.
  static List<String> validate(
    Map<String, Object?> defines, {
    OceanEyesReleaseTarget target = OceanEyesReleaseTarget.all,
  }) {
    final errors = <String>[];

    if (!_isTrue(defines[productionDefine])) {
      errors.add('$productionDefine must be explicitly set to true.');
    }

    _validateBoolean(defines, appCheckDefine, errors);
    _validateBoolean(defines, appCheckDebugDefine, errors);
    _validateBoolean(defines, firebaseEmulatorsDefine, errors);

    if (_isTrue(defines[firebaseEmulatorsDefine])) {
      errors.add(
        '$firebaseEmulatorsDefine must be false or omitted for a customer '
        'release.',
      );
    }
    if (_isTrue(defines[appCheckDebugDefine])) {
      errors.add(
        '$appCheckDebugDefine must be false or omitted for a customer '
        'release.',
      );
    }

    final required = <String>{..._coreRequired, ..._requiredForTarget(target)};
    final appCheckEnabled = _readBoolean(defines[appCheckDefine]) ?? true;
    if (_includesWeb(target) && appCheckEnabled) {
      required.add('OCEANEYES_RECAPTCHA_V3_SITE_KEY');
    }

    for (final key in required) {
      final value = defines[key];
      if (!_isConfiguredString(value)) {
        errors.add('$key must be a non-empty production value.');
      } else if (isPlaceholder(value as String)) {
        errors.add('$key still contains an example/placeholder value.');
      }
    }

    final requiredKeys = required;
    for (final entry in defines.entries) {
      final value = entry.value;
      if (value is String &&
          isPlaceholder(value) &&
          !requiredKeys.contains(entry.key)) {
        errors.add('${entry.key} still contains an example/placeholder value.');
      }
    }

    return errors;
  }

  /// Identifies values copied from the tracked example configuration or other
  /// common release placeholders.
  static bool isPlaceholder(String value) {
    final normalized = value.trim().toLowerCase();
    if (normalized.isEmpty) return false;
    const markers = <String>[
      'replace-with',
      'replace_me',
      'replace-me',
      'replace me',
      'your-project',
      'your_project',
      'your-',
      'your_',
      '<your',
      'changeme',
      'change-me',
      'placeholder',
      'dummy',
      'example.com',
      'example.org',
      'todo',
    ];
    return markers.any(normalized.contains);
  }

  static List<String> _requiredForTarget(OceanEyesReleaseTarget target) {
    final required = <String>{};
    switch (target) {
      case OceanEyesReleaseTarget.all:
        required
          ..addAll(_webRequired)
          ..addAll(_androidRequired)
          ..addAll(_iosRequired);
      case OceanEyesReleaseTarget.web:
        required.addAll(_webRequired);
      case OceanEyesReleaseTarget.android:
        required.addAll(_androidRequired);
      case OceanEyesReleaseTarget.ios:
        required.addAll(_iosRequired);
    }
    return required.toList(growable: false);
  }

  static bool _includesWeb(OceanEyesReleaseTarget target) =>
      target == OceanEyesReleaseTarget.all ||
      target == OceanEyesReleaseTarget.web;

  static void _validateBoolean(
    Map<String, Object?> defines,
    String key,
    List<String> errors,
  ) {
    if (defines.containsKey(key) && _readBoolean(defines[key]) == null) {
      errors.add('$key must be a boolean true/false value.');
    }
  }

  static bool _isConfiguredString(Object? value) =>
      value is String && value.trim().isNotEmpty;

  static bool _isTrue(Object? value) => _readBoolean(value) == true;

  static bool? _readBoolean(Object? value) {
    if (value is bool) return value;
    if (value is String) {
      switch (value.trim().toLowerCase()) {
        case 'true':
          return true;
        case 'false':
          return false;
      }
    }
    return null;
  }
}
