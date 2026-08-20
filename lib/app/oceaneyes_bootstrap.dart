import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../integrations/camera/camera_capture_gateway.dart';
import '../integrations/firebase/firebase_auth_gateway.dart';
import '../integrations/firebase/firebase_bootstrap.dart';
import '../integrations/firebase/firebase_notification_service.dart';
import '../integrations/firebase/firestore_oceaneyes_repository.dart';
import '../integrations/livekit/livekit_gateway.dart';
import '../integrations/ml/onnx_fish_inference.dart';
import '../integrations/power/wake_lock_gateway.dart';
import '../models/fish_inventory_repository.dart';
import '../models/oceaneyes_settings_repository.dart';
import '../view_models/oceaneyes_controller.dart';
import 'production_config.dart';

/// Selects the deterministic/local or production composition root.
///
/// Fixture URLs are rejected by [OceanEyesProductionConfig] before any
/// Firebase, camera, messaging, ML, or LiveKit object is constructed.
Future<OceanEyesController> bootstrapOceanEyesController({
  Uri? launchUri,
}) async {
  final uri = launchUri ?? Uri.base;
  final preferences = await SharedPreferences.getInstance();
  final inventory = SharedPreferencesFishInventoryRepository(preferences);
  final settings = SharedPreferencesOceanEyesSettingsRepository(preferences);
  final config = OceanEyesProductionConfig.fromEnvironment(launchUri: uri);

  if (!config.enabled) {
    return OceanEyesController(
      preferences: preferences,
      inventoryRepository: inventory,
      settingsRepository: settings,
      launchUri: uri,
      requireLogin: true,
    );
  }

  try {
    final bootstrap = await initializeOceanEyesFirebase(config);
    final firebaseAuth = FirebaseAuth.instanceFor(app: bootstrap.app);
    final firestore = FirebaseFirestore.instanceFor(app: bootstrap.app);
    final functions = FirebaseFunctions.instanceFor(
      app: bootstrap.app,
      region: config.functionsRegion,
    );
    final repository = FirestoreOceanEyesRepository(
      firestore: firestore,
      functions: functions,
      currentUserId: () => firebaseAuth.currentUser?.uid,
    );
    final auth = FirebaseAuthGateway(
      accountData: repository,
      auth: firebaseAuth,
      googleSignIn: _googleSignInFor(config),
      log: debugPrint,
    );
    await auth.ensureAnonymousSession();

    final controller = OceanEyesController(
      preferences: preferences,
      inventoryRepository: inventory,
      settingsRepository: settings,
      launchUri: uri,
      productionEnabled: true,
      productionRepository: repository,
      productionAuth: auth,
      cameraGateway: ProductionCameraCaptureGateway(),
      inferenceEngine: OnnxFishInference(),
      notificationService: FirebaseNotificationService(
        messaging: FirebaseMessaging.instance,
      ),
      liveGateway: LiveKitGateway(functions: functions),
      wakeLockGateway: ProductionWakeLockGateway(),
      webPushVapidKey: config.webPushVapidKey,
    );
    await controller.initializeProduction();
    return controller;
  } catch (error, stackTrace) {
    debugPrint('OceanEyes production startup failed: $error\n$stackTrace');
    return OceanEyesController(
      preferences: preferences,
      inventoryRepository: inventory,
      settingsRepository: settings,
      launchUri: uri,
      productionEnabled: true,
      productionStartupError: error.toString(),
    );
  }
}

GoogleSignIn _googleSignInFor(OceanEyesProductionConfig config) {
  final clientId = kIsWeb
      ? _nonEmpty(config.googleWebClientId)
      : defaultTargetPlatform == TargetPlatform.iOS
      ? _nonEmpty(config.iosClientId)
      : null;
  final serverClientId =
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android
      ? _nonEmpty(config.googleWebClientId)
      : null;
  return GoogleSignIn(clientId: clientId, serverClientId: serverClientId);
}

String? _nonEmpty(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}
