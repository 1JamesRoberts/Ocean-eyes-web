import 'package:flutter/foundation.dart';

/// Small set of values that cannot come from the generated FlutterFire file.
///
/// Firebase application options live in `firebase_options.dart`. Dart defines
/// are reserved for OAuth plus optional web messaging/App Check features.
class OceanEyesProductionConfig {
  const OceanEyesProductionConfig({
    required this.googleWebClientId,
    required this.iosClientId,
    required this.webPushVapidKey,
    required this.recaptchaV3SiteKey,
    this.productionEnabled = true,
  });

  factory OceanEyesProductionConfig.fromEnvironment() {
    return const OceanEyesProductionConfig(
      productionEnabled:
          bool.fromEnvironment('OCEANEYES_PRODUCTION') || kReleaseMode,
      googleWebClientId: String.fromEnvironment(
        'OCEANEYES_GOOGLE_WEB_CLIENT_ID',
      ),
      iosClientId: String.fromEnvironment('OCEANEYES_GOOGLE_IOS_CLIENT_ID'),
      webPushVapidKey: String.fromEnvironment('OCEANEYES_WEB_PUSH_VAPID_KEY'),
      recaptchaV3SiteKey: String.fromEnvironment(
        'OCEANEYES_RECAPTCHA_V3_SITE_KEY',
      ),
    );
  }

  static const functionsRegion = 'us-central1';

  /// Debug/profile runs are local previews unless production is explicitly
  /// enabled. Release builds default to production and therefore still fail
  /// closed when their private configuration is missing.
  final bool productionEnabled;
  final String googleWebClientId;
  final String iosClientId;
  final String webPushVapidKey;
  final String recaptchaV3SiteKey;

  /// Returns a concise startup error for service configuration required by
  /// the selected platform.
  String? validate() {
    if (!productionEnabled) return null;

    final errors = <String>[];
    if (!kIsWeb &&
        defaultTargetPlatform != TargetPlatform.android &&
        defaultTargetPlatform != TargetPlatform.iOS) {
      errors.add('OceanEyes production mode supports Android, iOS, and web.');
    }
    if (kIsWeb || defaultTargetPlatform == TargetPlatform.android) {
      _requireConfigured(
        'OCEANEYES_GOOGLE_WEB_CLIENT_ID',
        googleWebClientId,
        errors,
      );
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
      _requireConfigured('OCEANEYES_GOOGLE_IOS_CLIENT_ID', iosClientId, errors);
    }
    if (errors.isEmpty) return null;
    return errors.map((error) => '- $error').join('\n');
  }

  static void _requireConfigured(
    String name,
    String value,
    List<String> errors,
  ) {
    final normalized = value.trim().toLowerCase();
    if (normalized.isEmpty ||
        normalized.contains('replace-with') ||
        normalized.contains('replace_me') ||
        normalized.contains('placeholder')) {
      errors.add('$name must contain a real production value.');
    }
  }
}
