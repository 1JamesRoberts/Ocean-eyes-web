import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../models/production_auth.dart';

/// Small injectable driver that keeps Firebase/Google plugin objects out of
/// the public auth result types and makes collision behavior unit-testable.
abstract interface class FirebaseAuthDriver {
  ProductionAuthUser? get currentUser;

  Stream<ProductionAuthUser?> authStateChanges();

  Future<ProductionAuthUser> signInAnonymously();

  /// Returns null when the account chooser is cancelled.
  Future<Object?> requestGoogleCredential();

  Future<ProductionAuthUser> linkWithCredential(Object credential);

  Future<ProductionAuthUser> signInWithCredential(Object credential);

  Future<void> signOutGoogle();

  Future<void> signOutFirebase();
}

/// Web Firebase Auth uses its popup flow directly so the browser receives an
/// ID token. The legacy web GoogleSignIn.signIn() flow only returns an access
/// token and is not sufficient for reliable Firebase credential linking.
abstract interface class FirebaseGooglePopupAuthDriver {
  Future<ProductionAuthUser> linkGoogleWithPopup();

  Future<ProductionAuthUser> signInWithGooglePopup();
}

/// Internal collision signal carrying the credential Firebase says belongs to
/// an existing account.
class FirebaseCredentialCollision implements Exception {
  const FirebaseCredentialCollision(this.credential);

  final Object credential;
}

class FirebaseAuthGateway implements ProductionAuthGateway {
  FirebaseAuthGateway({
    required AuthAccountDataPort accountData,
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
    required AuthAccountDataPort accountData,
    void Function(String message)? log,
  }) : _accountData = accountData,
       _log = log ?? _ignoreLog;

  final FirebaseAuthDriver _driver;
  final AuthAccountDataPort _accountData;
  final void Function(String message) _log;
  Future<ProductionAuthUser>? _anonymousSessionFuture;

  static void _ignoreLog(String _) {}

  @override
  ProductionAuthUser? get currentUser => _driver.currentUser;

  @override
  bool get hasLinkedAccount => !(_driver.currentUser?.isAnonymous ?? true);

  @override
  Stream<ProductionAuthUser?> authStateChanges() => _driver.authStateChanges();

  @override
  Future<ProductionAuthUser> ensureAnonymousSession() async {
    final existing = _driver.currentUser;
    if (existing != null) return existing;
    final pending = _anonymousSessionFuture;
    if (pending != null) return pending;

    final future = _driver.signInAnonymously();
    _anonymousSessionFuture = future;
    try {
      final user = await future;
      _log('Created anonymous Firebase session for ${user.uid}.');
      return user;
    } finally {
      if (identical(_anonymousSessionFuture, future)) {
        _anonymousSessionFuture = null;
      }
    }
  }

  @override
  Future<GoogleAccountLinkResult> linkGoogleAccount({String? fcmToken}) async {
    var startingUser = _driver.currentUser;
    startingUser ??= await ensureAnonymousSession();

    final popupDriver = _driver is FirebaseGooglePopupAuthDriver
        ? _driver as FirebaseGooglePopupAuthDriver
        : null;
    if (popupDriver != null) {
      if (startingUser.isAnonymous) {
        try {
          // Start the popup before the first await so the browser retains the
          // click's user activation and does not block the new window.
          final linkedUserFuture = popupDriver.linkGoogleWithPopup();
          final linkedUser = await linkedUserFuture;
          _log('Linked anonymous account without changing its uid.');
          return GoogleAccountLinkResult(
            status: GoogleAccountLinkStatus.linkedAnonymousAccount,
            user: linkedUser,
          );
        } on FirebaseCredentialCollision catch (collision) {
          return _recoverFromGoogleCollision(
            startingUser: startingUser,
            credential: collision.credential,
            fcmToken: fcmToken,
          );
        }
      }

      // Start the popup before token cleanup for the same user-activation
      // reason. Cleanup can safely happen after Firebase switches users.
      final signedInUserFuture = popupDriver.signInWithGooglePopup();
      final signedInUser = await signedInUserFuture;
      final token = fcmToken?.trim();
      if (token != null && token.isNotEmpty) {
        await _accountData.removeFcmToken(token);
      }
      return GoogleAccountLinkResult(
        status: GoogleAccountLinkStatus.signedIn,
        user: signedInUser,
      );
    }

    // With an existing session this plugin call occurs before the first await,
    // preserving browser user activation for the Google chooser popup.
    final credentialFuture = _driver.requestGoogleCredential();
    final credential = await credentialFuture;
    if (credential == null) return const GoogleAccountLinkResult.cancelled();
    final token = fcmToken?.trim();

    if (startingUser.isAnonymous) {
      try {
        final linkedUser = await _driver.linkWithCredential(credential);
        _log('Linked anonymous account without changing its uid.');
        return GoogleAccountLinkResult(
          status: GoogleAccountLinkStatus.linkedAnonymousAccount,
          user: linkedUser,
        );
      } on FirebaseCredentialCollision catch (collision) {
        return _recoverFromGoogleCollision(
          startingUser: startingUser,
          credential: collision.credential,
          fcmToken: token,
        );
      }
    }

    // The session is already linked. This mirrors the deployed behavior and
    // allows the user to choose a different existing Google account.
    if (token != null && token.isNotEmpty) {
      await _accountData.removeFcmToken(token);
    }
    startingUser = await _driver.signInWithCredential(credential);
    return GoogleAccountLinkResult(
      status: GoogleAccountLinkStatus.signedIn,
      user: startingUser,
    );
  }

  Future<GoogleAccountLinkResult> _recoverFromGoogleCollision({
    required ProductionAuthUser startingUser,
    required Object credential,
    String? fcmToken,
  }) async {
    // This read must happen before switching credentials because locked rules
    // only allow users/{uid} to be read by that same uid.
    final previousTankIds = (await _accountData.linkedTankIdsForUser(
      startingUser.uid,
    )).toSet().toList()..sort();
    final token = fcmToken?.trim();
    if (token != null && token.isNotEmpty) {
      // Do not switch UIDs unless the device token has been detached from the
      // old account. The controller restores it in finally if this throws, or
      // attaches it to the new account after a successful move.
      await _accountData.removeFcmToken(token);
    }
    final existingUser = await _driver.signInWithCredential(credential);
    final rejoined = <String>[];
    final failed = <String>[];
    for (final tankId in previousTankIds) {
      try {
        if (await _accountData.joinTank(tankId)) {
          rejoined.add(tankId);
        } else {
          failed.add(tankId);
        }
      } catch (error) {
        failed.add(tankId);
        _log('Could not rejoin tank $tankId after auth collision: $error');
      }
    }
    _log(
      'Signed into an existing Google account; rejoined '
      '${rejoined.length}/${previousTankIds.length} tanks. Ownership was '
      'not transferred.',
    );
    return GoogleAccountLinkResult(
      status: GoogleAccountLinkStatus.signedIntoExistingAccount,
      user: existingUser,
      rejoinedTankIds: List.unmodifiable(rejoined),
      failedTankIds: List.unmodifiable(failed),
    );
  }

  @override
  Future<ProductionAuthUser> signOutToAnonymous({String? fcmToken}) async {
    final token = fcmToken?.trim();
    if (token != null && token.isNotEmpty) {
      // Do not switch identities while this device is still registered for
      // private alerts belonging to the previous account.
      await _accountData.removeFcmToken(token);
    }
    try {
      await _driver.signOutGoogle();
    } catch (error) {
      _log('Google provider sign-out failed: $error');
    }
    await _driver.signOutFirebase();
    return ensureAnonymousSession();
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
  Future<ProductionAuthUser> signInAnonymously() async {
    final credential = await _auth.signInAnonymously();
    return _requiredUser(credential.user);
  }

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
  Future<ProductionAuthUser> linkGoogleWithPopup() async {
    if (!kIsWeb) {
      throw UnsupportedError('Firebase Google popup auth is web-only.');
    }
    final user = _auth.currentUser;
    if (user == null) {
      throw StateError('An authenticated Firebase session is required.');
    }
    try {
      final result = await user.linkWithPopup(GoogleAuthProvider());
      return _requiredUser(result.user);
    } on FirebaseAuthException catch (error) {
      if (_isCredentialCollision(error) && error.credential != null) {
        throw FirebaseCredentialCollision(error.credential!);
      }
      rethrow;
    }
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
  Future<ProductionAuthUser> linkWithCredential(Object credential) async {
    final firebaseCredential = _credential(credential);
    final user = _auth.currentUser;
    if (user == null) {
      throw StateError('An authenticated Firebase session is required.');
    }
    try {
      final result = await user.linkWithCredential(firebaseCredential);
      return _requiredUser(result.user);
    } on FirebaseAuthException catch (error) {
      if (error.code != 'credential-already-in-use' &&
          error.code != 'email-already-in-use' &&
          error.code != 'account-exists-with-different-credential') {
        rethrow;
      }
      throw FirebaseCredentialCollision(error.credential ?? firebaseCredential);
    }
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

  static bool _isCredentialCollision(FirebaseAuthException error) =>
      error.code == 'credential-already-in-use' ||
      error.code == 'email-already-in-use' ||
      error.code == 'account-exists-with-different-credential';

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
      isAnonymous: user.isAnonymous,
      displayName: user.displayName,
      email: user.email,
      photoUrl: user.photoURL,
      providerIds: List.unmodifiable(providerIds),
    );
  }
}
