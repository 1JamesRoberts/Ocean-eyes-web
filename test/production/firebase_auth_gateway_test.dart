import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/firebase/firebase_auth_gateway.dart';
import 'package:oceaneyes/models/production_auth.dart';

void main() {
  group('FirebaseAuthGateway', () {
    test('uses the Firebase popup driver for browser linking', () async {
      final events = <String>[];
      final driver = _FakePopupAuthDriver(
        current: const ProductionAuthUser(
          uid: 'anonymous-uid',
          isAnonymous: true,
        ),
        events: events,
      );
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeAccountData(events: events),
      );

      final pending = gateway.linkGoogleAccount();
      expect(events, <String>['web-link-google-popup']);

      final result = await pending;
      expect(result.status, GoogleAccountLinkStatus.linkedAnonymousAccount);
      expect(result.user?.uid, 'anonymous-uid');
    });

    test('creates one anonymous session before protected work', () async {
      final driver = _FakeAuthDriver();
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeAccountData(),
      );

      final first = await gateway.ensureAnonymousSession();
      final second = await gateway.ensureAnonymousSession();

      expect(first.uid, 'anonymous-uid');
      expect(first.isAnonymous, isTrue);
      expect(identical(first, second), isTrue);
      expect(driver.events, <String>['anonymous']);
    });

    test('coalesces concurrent anonymous session requests', () async {
      final driver = _FakeAuthDriver();
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeAccountData(),
      );

      final users = await Future.wait(<Future<ProductionAuthUser>>[
        gateway.ensureAnonymousSession(),
        gateway.ensureAnonymousSession(),
      ]);

      expect(users.map((user) => user.uid), everyElement('anonymous-uid'));
      expect(driver.events, <String>['anonymous']);
    });

    test(
      'reports a cancelled Google chooser without losing anonymous auth',
      () async {
        final driver = _FakeAuthDriver()..googleCredential = null;
        final gateway = FirebaseAuthGateway.withDriver(
          driver,
          accountData: _FakeAccountData(),
        );

        final result = await gateway.linkGoogleAccount();

        expect(result.status, GoogleAccountLinkStatus.cancelled);
        expect(gateway.currentUser?.isAnonymous, isTrue);
        expect(driver.events, <String>['anonymous', 'choose-google']);
      },
    );

    test('links Google in place and preserves the anonymous uid', () async {
      final driver = _FakeAuthDriver(
        current: const ProductionAuthUser(uid: 'anon-1', isAnonymous: true),
      );
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeAccountData(),
      );

      final result = await gateway.linkGoogleAccount();

      expect(result.status, GoogleAccountLinkStatus.linkedAnonymousAccount);
      expect(result.user?.uid, 'anon-1');
      expect(result.user?.isAnonymous, isFalse);
      expect(driver.events, <String>[
        'choose-google',
        'link:selected-credential',
      ]);
    });

    test(
      'opens the Google chooser synchronously for an existing session',
      () async {
        final events = <String>[];
        final driver = _FakeAuthDriver(
          current: const ProductionAuthUser(uid: 'anon-1', isAnonymous: true),
          events: events,
        );
        final gateway = FirebaseAuthGateway.withDriver(
          driver,
          accountData: _FakeAccountData(events: events),
        );

        final result = gateway.linkGoogleAccount();

        expect(events, <String>['choose-google']);
        await result;
      },
    );

    test(
      'collision snapshots old tanks then rejoins on the existing account',
      () async {
        final events = <String>[];
        final driver = _FakeAuthDriver(
          current: const ProductionAuthUser(uid: 'anon-old', isAnonymous: true),
          events: events,
        )..linkCollides = true;
        final data = _FakeAccountData(
          tankIds: const <String>['tank-z', 'tank-a', 'tank-z'],
          failedJoins: const <String>{'tank-z'},
          events: events,
        );
        final gateway = FirebaseAuthGateway.withDriver(
          driver,
          accountData: data,
        );

        final result = await gateway.linkGoogleAccount(fcmToken: ' token-1 ');

        expect(
          result.status,
          GoogleAccountLinkStatus.signedIntoExistingAccount,
        );
        expect(result.user?.uid, 'existing-google-uid');
        expect(result.rejoinedTankIds, <String>['tank-a']);
        expect(result.failedTankIds, <String>['tank-z']);
        expect(events, <String>[
          'choose-google',
          'link:selected-credential',
          'read-tanks:anon-old',
          'remove-token:token-1',
          'sign-in:collision-credential',
          'join:tank-a',
          'join:tank-z',
        ]);
      },
    );

    test('does not switch accounts when old token detachment fails', () async {
      final events = <String>[];
      final driver = _FakeAuthDriver(
        current: const ProductionAuthUser(uid: 'anon-old', isAnonymous: true),
        events: events,
      )..linkCollides = true;
      final data = _FakeAccountData(
        events: events,
        removeTokenError: StateError('offline'),
      );
      final gateway = FirebaseAuthGateway.withDriver(driver, accountData: data);

      await expectLater(
        gateway.linkGoogleAccount(fcmToken: 'token-1'),
        throwsStateError,
      );

      expect(gateway.currentUser?.uid, 'anon-old');
      expect(events, <String>[
        'choose-google',
        'link:selected-credential',
        'read-tanks:anon-old',
        'remove-token:token-1',
      ]);
    });

    test('sign-out detaches the token and restores anonymous auth', () async {
      final events = <String>[];
      final driver = _FakeAuthDriver(
        current: const ProductionAuthUser(
          uid: 'google-uid',
          isAnonymous: false,
        ),
        events: events,
      );
      final data = _FakeAccountData(events: events);
      final gateway = FirebaseAuthGateway.withDriver(driver, accountData: data);

      final user = await gateway.signOutToAnonymous(fcmToken: ' token-1 ');

      expect(user.isAnonymous, isTrue);
      expect(events, <String>[
        'remove-token:token-1',
        'google-sign-out',
        'firebase-sign-out',
        'anonymous',
      ]);
    });

    test('does not sign out when token detachment fails', () async {
      final events = <String>[];
      final driver = _FakeAuthDriver(
        current: const ProductionAuthUser(
          uid: 'google-uid',
          isAnonymous: false,
        ),
        events: events,
      );
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeAccountData(
          events: events,
          removeTokenError: StateError('offline'),
        ),
      );

      await expectLater(
        gateway.signOutToAnonymous(fcmToken: 'token-1'),
        throwsStateError,
      );

      expect(gateway.currentUser?.uid, 'google-uid');
      expect(events, <String>['remove-token:token-1']);
    });
  });
}

class _FakeAuthDriver implements FirebaseAuthDriver {
  _FakeAuthDriver({ProductionAuthUser? current, List<String>? events})
    : _current = current,
      events = events ?? <String>[];

  ProductionAuthUser? _current;
  Object? googleCredential = 'selected-credential';
  bool linkCollides = false;
  final List<String> events;

  @override
  ProductionAuthUser? get currentUser => _current;

  @override
  Stream<ProductionAuthUser?> authStateChanges() => Stream.value(_current);

  @override
  Future<ProductionAuthUser> signInAnonymously() async {
    events.add('anonymous');
    return _current = const ProductionAuthUser(
      uid: 'anonymous-uid',
      isAnonymous: true,
    );
  }

  @override
  Future<Object?> requestGoogleCredential() async {
    events.add('choose-google');
    return googleCredential;
  }

  @override
  Future<ProductionAuthUser> linkWithCredential(Object credential) async {
    events.add('link:$credential');
    if (linkCollides) {
      throw const FirebaseCredentialCollision('collision-credential');
    }
    final uid = _current?.uid ?? 'linked-uid';
    return _current = ProductionAuthUser(uid: uid, isAnonymous: false);
  }

  @override
  Future<ProductionAuthUser> signInWithCredential(Object credential) async {
    events.add('sign-in:$credential');
    return _current = const ProductionAuthUser(
      uid: 'existing-google-uid',
      isAnonymous: false,
    );
  }

  @override
  Future<void> signOutGoogle() async {
    events.add('google-sign-out');
  }

  @override
  Future<void> signOutFirebase() async {
    events.add('firebase-sign-out');
    _current = null;
  }
}

class _FakePopupAuthDriver extends _FakeAuthDriver
    implements FirebaseGooglePopupAuthDriver {
  _FakePopupAuthDriver({super.current, super.events});

  @override
  Future<ProductionAuthUser> linkGoogleWithPopup() async {
    events.add('web-link-google-popup');
    return _current = ProductionAuthUser(
      uid: _current?.uid ?? 'linked-uid',
      isAnonymous: false,
    );
  }

  @override
  Future<ProductionAuthUser> signInWithGooglePopup() async {
    events.add('web-sign-in-google-popup');
    return _current = const ProductionAuthUser(
      uid: 'existing-google-uid',
      isAnonymous: false,
    );
  }
}

class _FakeAccountData implements AuthAccountDataPort {
  _FakeAccountData({
    this.tankIds = const <String>[],
    this.failedJoins = const <String>{},
    this.removeTokenError,
    List<String>? events,
  }) : events = events ?? <String>[];

  final List<String> tankIds;
  final Set<String> failedJoins;
  final Object? removeTokenError;
  final List<String> events;

  @override
  Future<List<String>> linkedTankIdsForUser(String userId) async {
    events.add('read-tanks:$userId');
    return tankIds;
  }

  @override
  Future<bool> joinTank(String tankId) async {
    events.add('join:$tankId');
    return !failedJoins.contains(tankId);
  }

  @override
  Future<void> removeFcmToken(String token) async {
    events.add('remove-token:$token');
    final error = removeTokenError;
    if (error != null) throw error;
  }
}
