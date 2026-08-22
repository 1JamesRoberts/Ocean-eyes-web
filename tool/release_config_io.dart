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
