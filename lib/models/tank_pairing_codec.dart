import 'dart:convert';

class TankPairingPayload {
  const TankPairingPayload({required this.tankId, this.version = 1});

  final int version;
  final String tankId;
}

enum TankPairingErrorCode {
  empty,
  invalidJson,
  invalidShape,
  unsupportedVersion,
  missingTankId,
  invalidTankId,
}

class TankPairingFormatException implements FormatException {
  const TankPairingFormatException(this.code, this.message, [this.source]);

  final TankPairingErrorCode code;

  @override
  final String message;

  @override
  final Object? source;

  @override
  int? get offset => null;

  @override
  String toString() => 'TankPairingFormatException($code): $message';
}

/// Compatibility codec for the deployed version-1 QR payload.
///
/// Version 1 is a bearer-style tank identifier and does not provide expiry or
/// replay protection. Authorization must therefore still be checked by the
/// repository and Firestore rules when [TankPairingPayload.tankId] is joined.
abstract final class TankPairingCodec {
  static const int currentVersion = 1;
  static const int _maxFirestoreIdBytes = 1500;

  static String encode(TankPairingPayload payload) {
    if (payload.version != currentVersion) {
      throw TankPairingFormatException(
        TankPairingErrorCode.unsupportedVersion,
        'Unsupported tank pairing version: ${payload.version}.',
        payload.version,
      );
    }
    final tankId = normalizeTankId(payload.tankId);
    return jsonEncode(<String, Object>{'v': currentVersion, 'tank_id': tankId});
  }

  static TankPairingPayload decode(String encoded) {
    final source = encoded.trim();
    if (source.isEmpty) {
      throw const TankPairingFormatException(
        TankPairingErrorCode.empty,
        'The pairing payload is empty.',
      );
    }

    final Object? decoded;
    try {
      decoded = jsonDecode(source);
    } on FormatException {
      throw TankPairingFormatException(
        TankPairingErrorCode.invalidJson,
        'The pairing payload is not valid JSON.',
        encoded,
      );
    }

    if (decoded is! Map) {
      throw TankPairingFormatException(
        TankPairingErrorCode.invalidShape,
        'The pairing payload must be a JSON object.',
        encoded,
      );
    }

    final rawVersion = decoded['v'];
    if (rawVersion is! num || rawVersion != currentVersion) {
      throw TankPairingFormatException(
        TankPairingErrorCode.unsupportedVersion,
        'Unsupported tank pairing version: $rawVersion.',
        encoded,
      );
    }

    final rawTankId = decoded['tank_id'];
    if (rawTankId is! String || rawTankId.trim().isEmpty) {
      throw TankPairingFormatException(
        TankPairingErrorCode.missingTankId,
        'The pairing payload does not contain a tank_id.',
        encoded,
      );
    }

    return TankPairingPayload(
      version: currentVersion,
      tankId: normalizeTankId(rawTankId),
    );
  }

  /// Validates and normalizes the manual-entry fallback using Firestore's
  /// document-ID constraints.
  static String normalizeTankId(String value) {
    final tankId = value.trim();
    final invalid =
        tankId.isEmpty ||
        tankId == '.' ||
        tankId == '..' ||
        tankId.contains('/') ||
        RegExp(r'^__.*__$').hasMatch(tankId) ||
        utf8.encode(tankId).length > _maxFirestoreIdBytes;
    if (invalid) {
      throw TankPairingFormatException(
        TankPairingErrorCode.invalidTankId,
        'The tank ID is not a valid Firestore document ID.',
        value,
      );
    }
    return tankId;
  }
}
