import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/models/tank_pairing_codec.dart';

void main() {
  group('TankPairingCodec', () {
    test('encodes and decodes the deployed v1 shape', () {
      const payload = TankPairingPayload(tankId: 'tank_AbC123');

      final encoded = TankPairingCodec.encode(payload);
      final decoded = TankPairingCodec.decode(encoded);

      expect(encoded, '{"v":1,"tank_id":"tank_AbC123"}');
      expect(decoded.version, 1);
      expect(decoded.tankId, 'tank_AbC123');
    });

    test('accepts a JSON numeric 1.0 from compatible encoders', () {
      final decoded = TankPairingCodec.decode('{"v":1.0,"tank_id":"tank"}');

      expect(decoded.version, 1);
      expect(decoded.tankId, 'tank');
    });

    test('trims a copied manual tank ID', () {
      expect(
        TankPairingCodec.normalizeTankId('  validTank42\n'),
        'validTank42',
      );
      expect(
        TankPairingCodec.decode(' {"v":1,"tank_id":" validTank42 "} ').tankId,
        'validTank42',
      );
    });

    test('reports malformed JSON separately from an invalid payload shape', () {
      expect(
        () => TankPairingCodec.decode('not-json'),
        throwsA(
          isA<TankPairingFormatException>().having(
            (error) => error.code,
            'code',
            TankPairingErrorCode.invalidJson,
          ),
        ),
      );
      expect(
        () => TankPairingCodec.decode('[1, 2]'),
        throwsA(
          isA<TankPairingFormatException>().having(
            (error) => error.code,
            'code',
            TankPairingErrorCode.invalidShape,
          ),
        ),
      );
    });

    test('rejects unsupported versions and missing tank IDs', () {
      expect(
        () => TankPairingCodec.decode('{"v":2,"tank_id":"abc"}'),
        throwsA(
          isA<TankPairingFormatException>().having(
            (error) => error.code,
            'code',
            TankPairingErrorCode.unsupportedVersion,
          ),
        ),
      );
      expect(
        () => TankPairingCodec.decode('{"v":1}'),
        throwsA(
          isA<TankPairingFormatException>().having(
            (error) => error.code,
            'code',
            TankPairingErrorCode.missingTankId,
          ),
        ),
      );
    });

    test('enforces Firestore document ID constraints', () {
      for (final invalid in <String>[
        '',
        '.',
        '..',
        'tank/child',
        '__reserved__',
      ]) {
        expect(
          () => TankPairingCodec.normalizeTankId(invalid),
          throwsA(
            isA<TankPairingFormatException>().having(
              (error) => error.code,
              'code for $invalid',
              TankPairingErrorCode.invalidTankId,
            ),
          ),
        );
      }
      expect(
        () => TankPairingCodec.normalizeTankId(
          List<String>.filled(1501, 'x').join(),
        ),
        throwsA(isA<TankPairingFormatException>()),
      );
    });
  });
}
