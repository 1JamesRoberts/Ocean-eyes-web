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

  final defines = <String, Object?>{};
  for (final entry in decoded.entries) {
    if (entry.key is! String) {
      throw const FormatException(
        'Every production configuration key must be a string.',
      );
    }
    defines[entry.key as String] = entry.value;
  }
  return defines;
}

String? optionValue(List<String> args, String option) {
  for (var index = 0; index < args.length; index += 1) {
    final argument = args[index];
    if (argument == option) {
      if (index + 1 >= args.length) {
        throw ArgumentError('$option requires a value.');
      }
      return args[index + 1];
    }
    final prefix = '$option=';
    if (argument.startsWith(prefix)) {
      final value = argument.substring(prefix.length);
      if (value.isEmpty) throw ArgumentError('$option requires a value.');
      return value;
    }
  }
  return null;
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
  return switch (value.trim().toLowerCase()) {
    'web' => const ReleaseArtifactTarget(
      flutterTarget: 'web',
      configTarget: OceanEyesReleaseTarget.web,
    ),
    'appbundle' => const ReleaseArtifactTarget(
      flutterTarget: 'appbundle',
      configTarget: OceanEyesReleaseTarget.android,
    ),
    'apk' => const ReleaseArtifactTarget(
      flutterTarget: 'apk',
      configTarget: OceanEyesReleaseTarget.android,
    ),
    'ipa' => const ReleaseArtifactTarget(
      flutterTarget: 'ipa',
      configTarget: OceanEyesReleaseTarget.ios,
    ),
    'ios' => const ReleaseArtifactTarget(
      flutterTarget: 'ios',
      configTarget: OceanEyesReleaseTarget.ios,
    ),
    _ => throw ArgumentError(
      'Unknown artifact "$value". Use web, appbundle, apk, ipa, or ios.',
    ),
  };
}
