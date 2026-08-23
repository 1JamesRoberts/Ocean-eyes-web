enum GoogleSignInStatus { cancelled, signedIn }

class ProductionAuthUser {
  const ProductionAuthUser({
    required this.uid,
    this.displayName,
    this.email,
    this.photoUrl,
    this.providerIds = const [],
  });

  final String uid;
  final String? displayName;
  final String? email;
  final String? photoUrl;
  final List<String> providerIds;

  bool get isGoogleUser => providerIds.contains('google.com');
}

class GoogleSignInResult {
  const GoogleSignInResult({required this.status, this.user});

  const GoogleSignInResult.cancelled()
    : status = GoogleSignInStatus.cancelled,
      user = null;

  final GoogleSignInStatus status;
  final ProductionAuthUser? user;
}

/// The account-data operation that must complete before an identity signs out.
abstract interface class AuthTokenDataPort {
  Future<void> removeFcmToken(String token);
}

abstract interface class ProductionAuthGateway {
  /// Returns a user only when the Firebase account has the Google provider.
  ProductionAuthUser? get currentUser;

  bool get isSignedIn;

  Stream<ProductionAuthUser?> authStateChanges();

  /// Clears a persisted Firebase session that was not authenticated by Google.
  Future<void> enforceGoogleOnlySession();

  Future<GoogleSignInResult> signInWithGoogle();

  Future<void> signOut({String? fcmToken});
}
