import 'dart:io';

import 'release_config_io.dart';

Future<void> main(List<String> args) async {
  try {
    final configPath = requiredOptionValue(
      args,
      '--config',
      'Missing --config. Pass the private production JSON file.',
    );
    final target = parseReleaseTarget(optionValue(args, '--target') ?? 'all');
    final errors = await validateReleaseConfig(configPath, target);
    if (writeReleaseConfigErrors(errors)) {
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
