enum GoogleAccountLinkStatus {
  cancelled,
  linkedAnonymousAccount,
  signedIntoExistingAccount,
  signedIn,
}

class ProductionAuthUser {
  const ProductionAuthUser({
    required this.uid,
    required this.isAnonymous,
    this.displayName,
    this.email,
    this.photoUrl,
    this.providerIds = const [],
  });

  final String uid;
  final bool isAnonymous;
  final String? displayName;
  final String? email;
  final String? photoUrl;
  final List<String> providerIds;
}

class GoogleAccountLinkResult {
  const GoogleAccountLinkResult({
    required this.status,
    this.user,
    this.rejoinedTankIds = const [],
    this.failedTankIds = const [],
  });

  const GoogleAccountLinkResult.cancelled()
    : status = GoogleAccountLinkStatus.cancelled,
      user = null,
      rejoinedTankIds = const [],
      failedTankIds = const [];

  final GoogleAccountLinkStatus status;
  final ProductionAuthUser? user;
  final List<String> rejoinedTankIds;
  final List<String> failedTankIds;
}

/// The narrow data boundary used while moving an anonymous session to an
/// already-linked Google account.
abstract interface class AuthAccountDataPort {
  Future<List<String>> linkedTankIdsForUser(String userId);

  Future<bool> joinTank(String tankId);

  Future<void> removeFcmToken(String token);
}

abstract interface class ProductionAuthGateway {
  ProductionAuthUser? get currentUser;

  bool get hasLinkedAccount;

  Stream<ProductionAuthUser?> authStateChanges();

  Future<ProductionAuthUser> ensureAnonymousSession();

  Future<GoogleAccountLinkResult> linkGoogleAccount({String? fcmToken});

  Future<ProductionAuthUser> signOutToAnonymous({String? fcmToken});
}
