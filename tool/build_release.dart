import 'dart:io';

import 'package:oceaneyes/app/release_config_guard.dart';

import 'release_config_io.dart';

/// Builds a customer artifact only after the same config checks used by CI.
///
/// Usage:
///   dart run tool/build_release.dart --target web --config C:\\secure\\oceaneyes-production.json
///
/// Extra Flutter build arguments may be supplied after `--`.
Future<void> main(List<String> args) async {
  try {
    final artifactName = optionValue(args, '--target');
    if (artifactName == null) {
      throw const FormatException(
        'Missing --target. Use web, appbundle, apk, ipa, or ios.',
      );
    }
    final configPath = optionValue(args, '--config');
    if (configPath == null) {
      throw const FormatException(
        'Missing --config. Pass the private production JSON file.',
      );
    }

    final artifact = parseArtifactTarget(artifactName);
    final defines = await readReleaseDefines(configPath);
    final errors = OceanEyesReleaseConfigGuard.validate(
      defines,
      target: artifact.configTarget,
    );
    if (errors.isNotEmpty) {
      stderr.writeln('Customer release configuration rejected:');
      for (final error in errors) {
        stderr.writeln(' - $error');
      }
      exitCode = 1;
      return;
    }

    final separator = args.indexOf('--');
    final extraArgs = separator == -1
        ? const <String>[]
        : args.sublist(separator + 1);
    final flutterArgs = <String>[
      'build',
      artifact.flutterTarget,
      '--release',
      '--dart-define-from-file=$configPath',
      // The app rejects release startup unless the guarded command supplied
      // this marker. Direct unconfigured Flutter release builds can therefore
      // never fall back to the fixture shell.
      '--dart-define=OCEANEYES_RELEASE_GUARD=true',
      ...extraArgs,
    ];

    final flutterCommand = Platform.isWindows ? 'flutter.bat' : 'flutter';
    final process = await Process.start(
      flutterCommand,
      flutterArgs,
      mode: ProcessStartMode.inheritStdio,
    );
    exitCode = await process.exitCode;
  } on Object catch (error) {
    stderr.writeln('Customer release build blocked: $error');
    exitCode = 1;
  }
}
