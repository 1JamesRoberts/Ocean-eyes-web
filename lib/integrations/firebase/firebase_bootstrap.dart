import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../../app/production_config.dart';

class FirebaseBootstrapResult {
  const FirebaseBootstrapResult({required this.app, required this.appCheck});

  final FirebaseApp app;
  final bool appCheck;
}

/// Initializes the Firebase services used by the production composition root.
/// Merely importing this file performs no plugin calls.
Future<FirebaseBootstrapResult> initializeOceanEyesFirebase(
  OceanEyesProductionConfig config,
) async {
  final validationError = config.validate();
  if (validationError != null) throw StateError(validationError);

  final existing = Firebase.apps;
  final app = existing.isNotEmpty
      ? Firebase.app()
      : await Firebase.initializeApp(
          options: config.firebaseOptionsForCurrentPlatform(),
        );

  if (config.useFirebaseEmulators) {
    await FirebaseAuth.instanceFor(
      app: app,
    ).useAuthEmulator(config.authEmulatorHost, config.authEmulatorPort);
    FirebaseFirestore.instanceFor(app: app).useFirestoreEmulator(
      config.firestoreEmulatorHost,
      config.firestoreEmulatorPort,
    );
    FirebaseFunctions.instanceFor(
      app: app,
      region: config.functionsRegion,
    ).useFunctionsEmulator(
      config.functionsEmulatorHost,
      config.functionsEmulatorPort,
    );
  }

  var appCheckActive = false;
  if (config.appCheckEnabled && !config.useFirebaseEmulators) {
    final webProvider = kIsWeb
        ? ReCaptchaV3Provider(config.recaptchaV3SiteKey)
        : null;
    await FirebaseAppCheck.instanceFor(app: app).activate(
      webProvider: webProvider,
      androidProvider: config.appCheckDebug
          ? AndroidProvider.debug
          : AndroidProvider.playIntegrity,
      appleProvider: config.appCheckDebug
          ? AppleProvider.debug
          : AppleProvider.appAttestWithDeviceCheckFallback,
    );
    appCheckActive = true;
  }

  return FirebaseBootstrapResult(app: app, appCheck: appCheckActive);
}
