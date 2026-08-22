import 'dart:convert';
import 'dart:io';

import 'package:oceaneyes/app/release_config_guard.dart';

Future<Map<String, Object?>> readReleaseDefines(String path) async {
  final file = File(path);
  if (!await file.exists()) {
    throw ArgumentError('Production configuration file not found: $path');
  }

  final decoded = jsonDecode(await file.readAsString());
  if (decoded is! Map) {
    throw const FormatException(
      'Production configuration must be a JSON object of Dart defines.',
    );
  }

  return Map<String, Object?>.from(decoded);
}

String? optionValue(List<String> args, String option) {
  final prefix = '$option=';
  for (var index = 0; index < args.length; index += 1) {
    final argument = args[index];
    if (argument == option) {
      if (index + 1 >= args.length) {
        throw ArgumentError('$option requires a value.');
      }
      return args[index + 1];
    }
    if (argument.startsWith(prefix)) {
      final value = argument.substring(prefix.length);
      if (value.isEmpty) throw ArgumentError('$option requires a value.');
      return value;
    }
  }
  return null;
}

String requiredOptionValue(
  List<String> args,
  String option,
  String missingMessage,
) => optionValue(args, option) ?? (throw FormatException(missingMessage));

Future<List<String>> validateReleaseConfig(
  String path,
  OceanEyesReleaseTarget target,
) async {
  final defines = await readReleaseDefines(path);
  return OceanEyesReleaseConfigGuard.validate(defines, target: target);
}

Future<List<String>> validateCustomerReleasePrerequisites(
  String path,
  OceanEyesReleaseTarget target, {
  required bool requireAndroidArtifact,
}) async {
  final errors = await validateReleaseConfig(path, target);
  if (!requireAndroidArtifact) return errors;

  final keyPropertiesFile = File('android/key.properties');
  if (!await keyPropertiesFile.exists()) {
    errors.add(
      'android/key.properties is required for a signed customer appbundle.',
    );
  } else {
    final properties = await _readKeyProperties(keyPropertiesFile);
    for (final key in const [
      'storeFile',
      'storePassword',
      'keyAlias',
      'keyPassword',
    ]) {
      if ((properties[key] ?? '').trim().isEmpty) {
        errors.add('android/key.properties is missing "$key".');
      }
    }
    final storeFile = properties['storeFile']?.trim() ?? '';
    if (storeFile.isNotEmpty) {
      final resolved = File(storeFile).isAbsolute
          ? File(storeFile)
          : File('android/app/$storeFile');
      if (!await resolved.exists()) {
        errors.add('The release keystore was not found at ${resolved.path}.');
      }
    }
  }

  for (final model in const [
    'fish_detector.onnx',
    'species_classifier.onnx',
    'water_clarity.onnx',
  ]) {
    final file = File('assets/models/$model');
    if (!await file.exists() || await file.length() == 0) {
      errors.add('Missing production model asset: ${file.path}.');
    }
  }
  return errors;
}

Future<Map<String, String>> _readKeyProperties(File file) async {
  final properties = <String, String>{};
  for (final line in await file.readAsLines()) {
    final trimmed = line.trim();
    if (trimmed.isEmpty || trimmed.startsWith('#')) continue;
    final separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    properties[trimmed.substring(0, separator).trim()] = trimmed
        .substring(separator + 1)
        .trim();
  }
  return properties;
}

bool writeReleaseConfigErrors(Iterable<String> errors) {
  if (errors.isEmpty) return false;

  stderr.writeln('Customer release configuration rejected:');
  for (final error in errors) {
    stderr.writeln(' - $error');
  }
  return true;
}

OceanEyesReleaseTarget parseReleaseTarget(String value) {
  return switch (value.trim().toLowerCase()) {
    'all' => OceanEyesReleaseTarget.all,
    'web' => OceanEyesReleaseTarget.web,
    'android' || 'appbundle' || 'apk' => OceanEyesReleaseTarget.android,
    'ios' || 'ipa' => OceanEyesReleaseTarget.ios,
    _ => throw ArgumentError(
      'Unknown release target "$value". Use web, appbundle/apk, ios/ipa, '
      'or all.',
    ),
  };
}

final class ReleaseArtifactTarget {
  const ReleaseArtifactTarget({
    required this.flutterTarget,
    required this.configTarget,
  });

  final String flutterTarget;
  final OceanEyesReleaseTarget configTarget;
}

ReleaseArtifactTarget parseArtifactTarget(String value) {
  final normalized = value.trim().toLowerCase();
  final configTarget = switch (normalized) {
    'web' => OceanEyesReleaseTarget.web,
    'appbundle' || 'apk' => OceanEyesReleaseTarget.android,
    'ipa' || 'ios' => OceanEyesReleaseTarget.ios,
    _ => throw ArgumentError(
      'Unknown artifact "$value". Use web, appbundle, apk, ipa, or ios.',
    ),
  };
  return ReleaseArtifactTarget(
    flutterTarget: normalized,
    configTarget: configTarget,
  );
}
