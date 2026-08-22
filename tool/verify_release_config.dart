import 'dart:io';

import 'package:oceaneyes/app/release_config_guard.dart';

import 'release_config_io.dart';

Future<void> main(List<String> args) async {
  try {
    final configPath = requiredOptionValue(
      args,
      '--config',
      'Missing --config. Pass the private production JSON file.',
    );
    final target = parseReleaseTarget(optionValue(args, '--target') ?? 'all');
    final errors = await validateCustomerReleasePrerequisites(
      configPath,
      target,
      requireAndroidArtifact:
          target == OceanEyesReleaseTarget.android ||
          target == OceanEyesReleaseTarget.all,
    );
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
