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
    final artifactName = requiredOptionValue(
      args,
      '--target',
      'Missing --target. Use web, appbundle, apk, ipa, or ios.',
    );
    final configPath = requiredOptionValue(
      args,
      '--config',
      'Missing --config. Pass the private production JSON file.',
    );

    final normalizedArtifact = artifactName.trim().toLowerCase();
    if (normalizedArtifact == 'apk') {
      throw ArgumentError(
        'Customer Android releases must be built as an appbundle. '
        'Use --target appbundle.',
      );
    }
    final artifact = parseArtifactTarget(artifactName);
    final errors = await validateCustomerReleasePrerequisites(
      configPath,
      artifact.configTarget,
      requireAndroidArtifact: normalizedArtifact == 'appbundle',
    );
    if (writeReleaseConfigErrors(errors)) {
      exitCode = 1;
      return;
    }

    final defines = await readReleaseDefines(configPath);
    final buildName = defines[OceanEyesReleaseConfigGuard.buildNameDefine];
    final buildNumber = defines[OceanEyesReleaseConfigGuard.buildNumberDefine];
    if (buildName is! String || buildNumber is! String) {
      stderr.writeln(
        'Customer release configuration is missing approved build metadata.',
      );
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
      '--build-name=${buildName.trim()}',
      '--build-number=${buildNumber.trim()}',
      // The app rejects release startup unless the guarded command supplied
      // this marker. Direct unconfigured Flutter release builds can therefore
      // never fall back to the fixture shell.
      '--dart-define=OCEANEYES_RELEASE_GUARD=true',
      ...extraArgs,
    ];

    const protectedPrefixes = <String>[
      '--dart-define-from-file',
      '--dart-define=OCEANEYES_PRODUCTION',
      '--dart-define=OCEANEYES_RELEASE_GUARD',
      '--build-name',
      '--build-number',
    ];
    if (extraArgs.any(
      (argument) => protectedPrefixes.any(argument.startsWith),
    )) {
      throw ArgumentError(
        'The guarded build owns production defines and release versioning; '
        'do not override them after --.',
      );
    }

    final flutterCommand = Platform.isWindows ? 'flutter.bat' : 'flutter';
    final process = await Process.start(
      flutterCommand,
      flutterArgs,
      mode: ProcessStartMode.inheritStdio,
    );
    exitCode = await process.exitCode;
    if (exitCode == 0 && normalizedArtifact == 'appbundle') {
      final artifactFile = File(
        'build/app/outputs/bundle/release/app-release.aab',
      );
      if (!await artifactFile.exists() || await artifactFile.length() == 0) {
        stderr.writeln(
          'Customer release build completed without producing the expected '
          '${artifactFile.path}.',
        );
        exitCode = 1;
      }
    }
  } on Object catch (error) {
    stderr.writeln('Customer release build blocked: $error');
    exitCode = 1;
  }
}
