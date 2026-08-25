import 'package:flutter/foundation.dart';

/// Small set of values that cannot come from the generated FlutterFire file.
///
/// Firebase application options live in `firebase_options.dart`. Dart defines
/// can override OAuth and optional web features, or explicitly select the
/// isolated local preview in non-release builds.
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
          kReleaseMode || !bool.fromEnvironment('OCEANEYES_LOCAL_PREVIEW'),
      googleWebClientId: String.fromEnvironment(
        'OCEANEYES_GOOGLE_WEB_CLIENT_ID',
        defaultValue:
            '1072877532089-v30cb58f31bqi7fb4hhsmfi1hm4o50do.apps.googleusercontent.com',
      ),
      iosClientId: String.fromEnvironment(
        'OCEANEYES_GOOGLE_IOS_CLIENT_ID',
        defaultValue:
            '1072877532089-2g61s4i4urjeirjis1cddegenseupg5m.apps.googleusercontent.com',
      ),
      webPushVapidKey: String.fromEnvironment('OCEANEYES_WEB_PUSH_VAPID_KEY'),
      recaptchaV3SiteKey: String.fromEnvironment(
        'OCEANEYES_RECAPTCHA_V3_SITE_KEY',
      ),
    );
  }

  static const functionsRegion = 'us-central1';

  /// All app builds use real services by default. Mocked behavior is reserved
  /// for tests and the explicitly selected local-preview mode.
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
