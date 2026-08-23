import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../../app/production_config.dart';
import '../../firebase_options.dart';

/// Initializes the single Firebase project used by the production MVP.
///
/// Firebase options are generated once by FlutterFire and committed as the
/// client-side application configuration. Runtime Dart defines are limited to
/// values that are not part of Firebase initialization.
Future<FirebaseApp> initializeOceanEyesFirebase(
  OceanEyesProductionConfig config,
) async {
  final app = Firebase.apps.isNotEmpty
      ? Firebase.app()
      : await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );

  await FirebaseAppCheck.instanceFor(app: app).activate(
    webProvider: kIsWeb ? ReCaptchaV3Provider(config.recaptchaV3SiteKey) : null,
    androidProvider: AndroidProvider.playIntegrity,
    appleProvider: AppleProvider.appAttestWithDeviceCheckFallback,
  );
  return app;
}
