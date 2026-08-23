import 'package:flutter/foundation.dart';

/// Small set of values that cannot come from the generated FlutterFire file.
///
/// Firebase application options live in `firebase_options.dart`. Dart defines
/// are reserved for OAuth, web messaging/App Check, and customer-facing legal
/// links.
class OceanEyesProductionConfig {
  const OceanEyesProductionConfig({
    required this.googleWebClientId,
    required this.iosClientId,
    required this.webPushVapidKey,
    required this.recaptchaV3SiteKey,
    required this.privacyPolicyUrl,
    required this.termsOfServiceUrl,
  });

  factory OceanEyesProductionConfig.fromEnvironment() {
    return const OceanEyesProductionConfig(
      googleWebClientId: String.fromEnvironment(
        'OCEANEYES_GOOGLE_WEB_CLIENT_ID',
      ),
      iosClientId: String.fromEnvironment('OCEANEYES_GOOGLE_IOS_CLIENT_ID'),
      webPushVapidKey: String.fromEnvironment('OCEANEYES_WEB_PUSH_VAPID_KEY'),
      recaptchaV3SiteKey: String.fromEnvironment(
        'OCEANEYES_RECAPTCHA_V3_SITE_KEY',
      ),
      privacyPolicyUrl: String.fromEnvironment('OCEANEYES_PRIVACY_POLICY_URL'),
      termsOfServiceUrl: String.fromEnvironment(
        'OCEANEYES_TERMS_OF_SERVICE_URL',
      ),
    );
  }

  static const functionsRegion = 'us-central1';
  final String googleWebClientId;
  final String iosClientId;
  final String webPushVapidKey;
  final String recaptchaV3SiteKey;
  final String privacyPolicyUrl;
  final String termsOfServiceUrl;

  /// Returns a concise startup error instead of allowing a partially
  /// configured customer build to continue into Firebase initialization.
  String? validate() {
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
    if (kIsWeb) {
      _requireConfigured(
        'OCEANEYES_WEB_PUSH_VAPID_KEY',
        webPushVapidKey,
        errors,
      );
      _requireConfigured(
        'OCEANEYES_RECAPTCHA_V3_SITE_KEY',
        recaptchaV3SiteKey,
        errors,
      );
    }
    _requireHttpsUrl('OCEANEYES_PRIVACY_POLICY_URL', privacyPolicyUrl, errors);
    _requireHttpsUrl(
      'OCEANEYES_TERMS_OF_SERVICE_URL',
      termsOfServiceUrl,
      errors,
    );

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

  static void _requireHttpsUrl(String name, String value, List<String> errors) {
    final uri = Uri.tryParse(value.trim());
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
      errors.add('$name must be a real HTTPS URL.');
    }
  }
}
