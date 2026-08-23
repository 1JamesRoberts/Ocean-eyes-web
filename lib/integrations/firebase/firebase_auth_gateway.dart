import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../models/production_auth.dart';

/// Small injectable driver that keeps Firebase/Google plugin objects out of
/// the public auth result types.
abstract interface class FirebaseAuthDriver {
  ProductionAuthUser? get currentUser;

  Stream<ProductionAuthUser?> authStateChanges();

  /// Returns null when the account chooser is cancelled.
  Future<Object?> requestGoogleCredential();

  Future<ProductionAuthUser> signInWithCredential(Object credential);

  Future<void> signOutGoogle();

  Future<void> signOutFirebase();
}

/// Web Firebase Auth uses its popup flow directly so the browser receives an
/// ID token. The GoogleSignIn web flow only returns an access token and is not
/// sufficient for reliable Firebase authentication.
abstract interface class FirebaseGooglePopupAuthDriver {
  Future<ProductionAuthUser> signInWithGooglePopup();
}

class FirebaseAuthGateway implements ProductionAuthGateway {
  FirebaseAuthGateway({
    required AuthTokenDataPort accountData,
    FirebaseAuth? auth,
    GoogleSignIn? googleSignIn,
    void Function(String message)? log,
  }) : this.withDriver(
         _PluginFirebaseAuthDriver(
           auth ?? FirebaseAuth.instance,
           googleSignIn ?? GoogleSignIn(),
         ),
         accountData: accountData,
         log: log,
       );

  FirebaseAuthGateway.withDriver(
    this._driver, {
    required AuthTokenDataPort accountData,
    void Function(String message)? log,
  }) : _accountData = accountData,
       _log = log ?? _ignoreLog;

  final FirebaseAuthDriver _driver;
  final AuthTokenDataPort _accountData;
  final void Function(String message) _log;

  static void _ignoreLog(String _) {}

  @override
  ProductionAuthUser? get currentUser => _googleUser(_driver.currentUser);

  @override
  bool get isSignedIn => currentUser != null;

  @override
  Stream<ProductionAuthUser?> authStateChanges() =>
      _driver.authStateChanges().map(_googleUser);

  @override
  Future<void> enforceGoogleOnlySession() async {
    final user = _driver.currentUser;
    if (user == null || user.isGoogleUser) return;
    _log('Discarding a persisted Firebase session without Google identity.');
    await _signOutProviders();
  }

  @override
  Future<GoogleSignInResult> signInWithGoogle() async {
    final existing = currentUser;
    if (existing != null) {
      return GoogleSignInResult(
        status: GoogleSignInStatus.signedIn,
        user: existing,
      );
    }

    final popupDriver = _driver is FirebaseGooglePopupAuthDriver
        ? _driver as FirebaseGooglePopupAuthDriver
        : null;
    if (popupDriver != null) {
      // Start the popup before the first await so the browser retains the
      // click's user activation and does not block the new window.
      final signedIn = await popupDriver.signInWithGooglePopup();
      return GoogleSignInResult(
        status: GoogleSignInStatus.signedIn,
        user: _requiredGoogleUser(signedIn),
      );
    }

    final credential = await _driver.requestGoogleCredential();
    if (credential == null) return const GoogleSignInResult.cancelled();
    final signedIn = await _driver.signInWithCredential(credential);
    return GoogleSignInResult(
      status: GoogleSignInStatus.signedIn,
      user: _requiredGoogleUser(signedIn),
    );
  }

  @override
  Future<void> signOut({String? fcmToken}) async {
    final token = fcmToken?.trim();
    if (token != null && token.isNotEmpty) {
      // Keep the identity active if private-alert routing cannot first be
      // detached from this device.
      await _accountData.removeFcmToken(token);
    }
    await _signOutProviders();
  }

  Future<void> _signOutProviders() async {
    try {
      await _driver.signOutGoogle();
    } catch (error) {
      _log('Google provider sign-out failed: $error');
    }
    await _driver.signOutFirebase();
  }

  static ProductionAuthUser? _googleUser(ProductionAuthUser? user) =>
      (user?.isGoogleUser ?? false) ? user : null;

  static ProductionAuthUser _requiredGoogleUser(ProductionAuthUser user) {
    if (!user.isGoogleUser) {
      throw StateError('Firebase did not return a Google-authenticated user.');
    }
    return user;
  }
}

class _PluginFirebaseAuthDriver
    implements FirebaseAuthDriver, FirebaseGooglePopupAuthDriver {
  _PluginFirebaseAuthDriver(this._auth, this._googleSignIn);

  final FirebaseAuth _auth;
  final GoogleSignIn _googleSignIn;

  @override
  ProductionAuthUser? get currentUser => _mapUser(_auth.currentUser);

  @override
  Stream<ProductionAuthUser?> authStateChanges() =>
      _auth.authStateChanges().map(_mapUser);

  @override
  Future<Object?> requestGoogleCredential() async {
    final googleUser = await _googleSignIn.signIn();
    if (googleUser == null) return null;
    final tokens = await googleUser.authentication;
    return GoogleAuthProvider.credential(
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
    );
  }

  @override
  Future<ProductionAuthUser> signInWithGooglePopup() async {
    if (!kIsWeb) {
      throw UnsupportedError('Firebase Google popup auth is web-only.');
    }
    final result = await _auth.signInWithPopup(GoogleAuthProvider());
    return _requiredUser(result.user);
  }

  @override
  Future<ProductionAuthUser> signInWithCredential(Object credential) async {
    final result = await _auth.signInWithCredential(_credential(credential));
    return _requiredUser(result.user);
  }

  @override
  Future<void> signOutGoogle() => _googleSignIn.signOut();

  @override
  Future<void> signOutFirebase() => _auth.signOut();

  static AuthCredential _credential(Object credential) {
    if (credential is! AuthCredential) {
      throw ArgumentError.value(
        credential,
        'credential',
        'Expected a Firebase AuthCredential.',
      );
    }
    return credential;
  }

  static ProductionAuthUser _requiredUser(User? user) {
    final mapped = _mapUser(user);
    if (mapped == null) {
      throw StateError(
        'Firebase returned an authentication result with no user.',
      );
    }
    return mapped;
  }

  static ProductionAuthUser? _mapUser(User? user) {
    if (user == null) return null;
    final providerIds =
        user.providerData
            .map((provider) => provider.providerId)
            .where((providerId) => providerId.isNotEmpty)
            .toSet()
            .toList()
          ..sort();
    return ProductionAuthUser(
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoUrl: user.photoURL,
      providerIds: List.unmodifiable(providerIds),
    );
  }
}
