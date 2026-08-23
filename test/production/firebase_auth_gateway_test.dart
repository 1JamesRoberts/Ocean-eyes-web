import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/firebase/firebase_auth_gateway.dart';
import 'package:oceaneyes/models/production_auth.dart';

void main() {
  group('FirebaseAuthGateway', () {
    test('fresh sessions remain unauthenticated', () async {
      final driver = _FakeAuthDriver();
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeTokenData(),
      );

      await gateway.enforceGoogleOnlySession();

      expect(gateway.currentUser, isNull);
      expect(gateway.isSignedIn, isFalse);
      expect(driver.events, isEmpty);
    });

    test('discards a persisted non-Google Firebase session', () async {
      final driver = _FakeAuthDriver(current: _unsupportedUser);
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeTokenData(),
      );

      expect(gateway.currentUser, isNull);
      await gateway.enforceGoogleOnlySession();

      expect(driver.currentUser, isNull);
      expect(driver.events, ['google-sign-out', 'firebase-sign-out']);
    });

    test(
      'returns a persisted Google account without changing its uid',
      () async {
        final driver = _FakeAuthDriver(current: _googleUser);
        final gateway = FirebaseAuthGateway.withDriver(
          driver,
          accountData: _FakeTokenData(),
        );

        await gateway.enforceGoogleOnlySession();
        final result = await gateway.signInWithGoogle();

        expect(result.status, GoogleSignInStatus.signedIn);
        expect(result.user?.uid, _googleUser.uid);
        expect(driver.events, isEmpty);
      },
    );

    test('reports a cancelled Google chooser as unauthenticated', () async {
      final driver = _FakeAuthDriver()..googleCredential = null;
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeTokenData(),
      );

      final result = await gateway.signInWithGoogle();

      expect(result.status, GoogleSignInStatus.cancelled);
      expect(result.user, isNull);
      expect(gateway.currentUser, isNull);
      expect(driver.events, ['choose-google']);
    });

    test('signs into Firebase with the selected Google credential', () async {
      final driver = _FakeAuthDriver();
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeTokenData(),
      );

      final result = await gateway.signInWithGoogle();

      expect(result.user, _googleUser);
      expect(gateway.currentUser?.uid, _googleUser.uid);
      expect(driver.events, ['choose-google', 'sign-in:selected-credential']);
    });

    test('starts the browser popup synchronously', () async {
      final events = <String>[];
      final driver = _FakePopupAuthDriver(events: events);
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeTokenData(),
      );

      final pending = gateway.signInWithGoogle();
      expect(events, ['web-sign-in-google-popup']);

      final result = await pending;
      expect(result.user?.uid, _googleUser.uid);
    });

    test('rejects a non-Google result from the auth provider', () async {
      final driver = _FakeAuthDriver()..signInUser = _unsupportedUser;
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeTokenData(),
      );

      await expectLater(gateway.signInWithGoogle(), throwsStateError);
      expect(gateway.currentUser, isNull);
    });

    test('sign-out detaches the token and becomes unauthenticated', () async {
      final events = <String>[];
      final driver = _FakeAuthDriver(current: _googleUser, events: events);
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeTokenData(events: events),
      );

      await gateway.signOut(fcmToken: ' token-1 ');

      expect(gateway.currentUser, isNull);
      expect(events, [
        'remove-token:token-1',
        'google-sign-out',
        'firebase-sign-out',
      ]);
    });

    test('does not sign out when token detachment fails', () async {
      final events = <String>[];
      final driver = _FakeAuthDriver(current: _googleUser, events: events);
      final gateway = FirebaseAuthGateway.withDriver(
        driver,
        accountData: _FakeTokenData(
          events: events,
          removeTokenError: StateError('offline'),
        ),
      );

      await expectLater(gateway.signOut(fcmToken: 'token-1'), throwsStateError);

      expect(gateway.currentUser?.uid, _googleUser.uid);
      expect(events, ['remove-token:token-1']);
    });
  });
}

const _googleUser = ProductionAuthUser(
  uid: 'google-uid',
  email: 'aquarist@example.com',
  providerIds: ['google.com'],
);
const _unsupportedUser = ProductionAuthUser(
  uid: 'unsupported-uid',
  providerIds: ['password'],
);

class _FakeAuthDriver implements FirebaseAuthDriver {
  _FakeAuthDriver({ProductionAuthUser? current, List<String>? events})
    : _current = current,
      events = events ?? <String>[];

  ProductionAuthUser? _current;
  Object? googleCredential = 'selected-credential';
  ProductionAuthUser signInUser = _googleUser;
  final List<String> events;

  @override
  ProductionAuthUser? get currentUser => _current;

  @override
  Stream<ProductionAuthUser?> authStateChanges() => Stream.value(_current);

  @override
  Future<Object?> requestGoogleCredential() async {
    events.add('choose-google');
    return googleCredential;
  }

  @override
  Future<ProductionAuthUser> signInWithCredential(Object credential) async {
    events.add('sign-in:$credential');
    return _current = signInUser;
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
  _FakePopupAuthDriver({super.events});

  @override
  Future<ProductionAuthUser> signInWithGooglePopup() async {
    events.add('web-sign-in-google-popup');
    return _current = _googleUser;
  }
}

class _FakeTokenData implements AuthTokenDataPort {
  _FakeTokenData({this.removeTokenError, List<String>? events})
    : events = events ?? <String>[];

  final Object? removeTokenError;
  final List<String> events;

  @override
  Future<void> removeFcmToken(String token) async {
    events.add('remove-token:$token');
    final error = removeTokenError;
    if (error != null) throw error;
  }
}
