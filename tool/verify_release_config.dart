import 'dart:io';

import 'package:oceaneyes/app/release_config_guard.dart';

import 'release_config_io.dart';

Future<void> main(List<String> args) async {
  try {
    final configPath = optionValue(args, '--config');
    if (configPath == null) {
      throw const FormatException(
        'Missing --config. Pass the private production JSON file.',
      );
    }
    final target = parseReleaseTarget(optionValue(args, '--target') ?? 'all');
    final defines = await readReleaseDefines(configPath);
    final errors = OceanEyesReleaseConfigGuard.validate(
      defines,
      target: target,
    );
    if (errors.isNotEmpty) {
      stderr.writeln('Customer release configuration rejected:');
      for (final error in errors) {
        stderr.writeln(' - $error');
      }
      exitCode = 1;
      return;
    }

    stdout.writeln(
      'Customer release configuration is valid for ${target.name}; '
      'fixture mode and emulator/debug settings are disabled.',
    );
  } on Object catch (error) {
    stderr.writeln('Release configuration check failed: $error');
    exitCode = 1;
  }
}
