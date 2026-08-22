import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/release_config_guard.dart';

void main() {
  test('accepts complete production defines for every target', () {
    final errors = OceanEyesReleaseConfigGuard.validate(_validDefines());

    expect(errors, isEmpty);
  });

  test('requires an explicit production define', () {
    final defines = _validDefines()..remove('OCEANEYES_PRODUCTION');

    final errors = OceanEyesReleaseConfigGuard.validate(defines);

    expect(
      errors,
      contains('OCEANEYES_PRODUCTION must be explicitly set to true.'),
    );
  });

  test('rejects tracked example placeholders, including optional values', () {
    final defines = _validDefines()
      ..['OCEANEYES_FIREBASE_PROJECT_ID'] = 'replace-with-your-project-id'
      ..['OCEANEYES_FUNCTIONS_REGION'] = 'replace-me';

    final errors = OceanEyesReleaseConfigGuard.validate(defines);

    expect(
      errors,
      contains(
        'OCEANEYES_FIREBASE_PROJECT_ID still contains an example/placeholder '
        'value.',
      ),
    );
    expect(
      errors,
      contains(
        'OCEANEYES_FUNCTIONS_REGION still contains an example/placeholder '
        'value.',
      ),
    );
  });

  test('rejects emulator and App Check debug settings', () {
    final defines = _validDefines()
      ..['OCEANEYES_FIREBASE_EMULATORS'] = true
      ..['OCEANEYES_APP_CHECK_DEBUG'] = true;

    final errors = OceanEyesReleaseConfigGuard.validate(defines);

    expect(
      errors,
      contains(
        'OCEANEYES_FIREBASE_EMULATORS must be false or omitted for a customer '
        'release.',
      ),
    );
    expect(
      errors,
      contains(
        'OCEANEYES_APP_CHECK_DEBUG must be false or omitted for a customer '
        'release.',
      ),
    );
  });

  test('requires target-specific values', () {
    final defines = _validDefines()
      ..remove('OCEANEYES_FIREBASE_WEB_PUSH_VAPID_KEY');

    final errors = OceanEyesReleaseConfigGuard.validate(
      defines,
      target: OceanEyesReleaseTarget.web,
    );

    expect(
      errors,
      contains(
        'OCEANEYES_FIREBASE_WEB_PUSH_VAPID_KEY must be a non-empty production '
        'value.',
      ),
    );
  });

  test('allows optional Firebase metadata to be omitted', () {
    final defines = _validDefines()
      ..remove('OCEANEYES_FIREBASE_STORAGE_BUCKET')
      ..remove('OCEANEYES_FIREBASE_MEASUREMENT_ID')
      ..remove('OCEANEYES_FIREBASE_IOS_BUNDLE_ID')
      ..remove('OCEANEYES_FIREBASE_ANDROID_CLIENT_ID');

    final errors = OceanEyesReleaseConfigGuard.validate(defines);

    expect(errors, isEmpty);
  });

  test('rejects malformed boolean values', () {
    final defines = _validDefines()..['OCEANEYES_APP_CHECK'] = 'enabled';

    final errors = OceanEyesReleaseConfigGuard.validate(defines);

    expect(
      errors,
      contains('OCEANEYES_APP_CHECK must be a boolean true/false value.'),
    );
  });
}

Map<String, Object?> _validDefines() => <String, Object?>{
  'OCEANEYES_PRODUCTION': true,
  'OCEANEYES_APP_CHECK': true,
  'OCEANEYES_APP_CHECK_DEBUG': false,
  'OCEANEYES_FIREBASE_EMULATORS': false,
  'OCEANEYES_FIREBASE_API_KEY': 'AIzaSyA-valid-production-key',
  'OCEANEYES_FIREBASE_PROJECT_ID': 'oceaneyes-production',
  'OCEANEYES_FIREBASE_MESSAGING_SENDER_ID': '123456789012',
  'OCEANEYES_FIREBASE_ANDROID_APP_ID': '1:123456789012:android:abcdef',
  'OCEANEYES_FIREBASE_IOS_APP_ID': '1:123456789012:ios:abcdef',
  'OCEANEYES_FIREBASE_WEB_APP_ID': '1:123456789012:web:abcdef',
  'OCEANEYES_FIREBASE_AUTH_DOMAIN': 'oceaneyes-production.firebaseapp.com',
  'OCEANEYES_FIREBASE_STORAGE_BUCKET':
      'oceaneyes-production.firebasestorage.app',
  'OCEANEYES_FIREBASE_ANDROID_CLIENT_ID':
      '123456789012-android.apps.googleusercontent.com',
  'OCEANEYES_FIREBASE_IOS_CLIENT_ID':
      '123456789012-ios.apps.googleusercontent.com',
  'OCEANEYES_GOOGLE_WEB_CLIENT_ID':
      '123456789012-web.apps.googleusercontent.com',
  'OCEANEYES_FIREBASE_WEB_PUSH_VAPID_KEY': 'BValidWebPushKey',
  'OCEANEYES_RECAPTCHA_V3_SITE_KEY': 'valid-recaptcha-site-key',
};
