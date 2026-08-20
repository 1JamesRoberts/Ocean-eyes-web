import 'package:firebase_auth/firebase_auth.dart';
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
        // This read must happen before switching credentials because locked
        // rules only allow users/{uid} to be read by that same uid.
        final previousTankIds = (await _accountData.linkedTankIdsForUser(
          startingUser.uid,
        )).toSet().toList()..sort();
        if (token != null && token.isNotEmpty) {
          // Do not switch UIDs unless the device token has been detached from
          // the old account. The controller restores it in finally if this
          // throws, or attaches it to the new account after a successful move.
          await _accountData.removeFcmToken(token);
        }
        final existingUser = await _driver.signInWithCredential(
          collision.credential,
        );
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

class _PluginFirebaseAuthDriver implements FirebaseAuthDriver {
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
