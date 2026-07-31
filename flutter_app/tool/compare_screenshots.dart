import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:image/image.dart' as img;

void main(List<String> arguments) {
  if (arguments.length != 3) {
    stderr.writeln(
      'Usage: dart run tool/compare_screenshots.dart '
      '<reference.png> <candidate.png> <output-directory>',
    );
    exitCode = 64;
    return;
  }

  final referenceFile = File(arguments[0]);
  final candidateFile = File(arguments[1]);
  if (!referenceFile.existsSync() || !candidateFile.existsSync()) {
    stderr.writeln('Both screenshot paths must exist.');
    exitCode = 66;
    return;
  }

  final reference = img.decodeImage(referenceFile.readAsBytesSync());
  final decodedCandidate = img.decodeImage(candidateFile.readAsBytesSync());
  if (reference == null || decodedCandidate == null) {
    stderr.writeln('Both inputs must be supported raster images.');
    exitCode = 65;
    return;
  }
  final candidate =
      decodedCandidate.width == reference.width &&
          decodedCandidate.height == reference.height
      ? decodedCandidate
      : img.copyResize(
          decodedCandidate,
          width: reference.width,
          height: reference.height,
          interpolation: img.Interpolation.linear,
        );

  final overlay = img.Image(width: reference.width, height: reference.height);
  final difference = img.Image(
    width: reference.width,
    height: reference.height,
  );
  var totalError = 0.0;
  var materiallyDifferent = 0;
  final pixelCount = reference.width * reference.height;

  for (var y = 0; y < reference.height; y += 1) {
    for (var x = 0; x < reference.width; x += 1) {
      final a = reference.getPixel(x, y);
      final b = candidate.getPixel(x, y);
      final redDelta = (a.r - b.r).abs().toInt();
      final greenDelta = (a.g - b.g).abs().toInt();
      final blueDelta = (a.b - b.b).abs().toInt();
      final alphaDelta = (a.a - b.a).abs().toInt();
      totalError +=
          (redDelta + greenDelta + blueDelta + alphaDelta) / (255 * 4);
      if (math.max(math.max(redDelta, greenDelta), blueDelta) > 12) {
        materiallyDifferent += 1;
      }

      overlay.setPixelRgba(
        x,
        y,
        ((a.r + b.r) / 2).round(),
        ((a.g + b.g) / 2).round(),
        ((a.b + b.b) / 2).round(),
        255,
      );
      difference.setPixelRgba(
        x,
        y,
        math.min(255, redDelta * 4),
        math.min(255, greenDelta * 4),
        math.min(255, blueDelta * 4),
        255,
      );
    }
  }

  final output = Directory(arguments[2])..createSync(recursive: true);
  File('${output.path}/overlay.png').writeAsBytesSync(img.encodePng(overlay));
  File(
    '${output.path}/difference.png',
  ).writeAsBytesSync(img.encodePng(difference));
  stdout.writeln(
    const JsonEncoder.withIndent('  ').convert({
      'referenceSize': '${reference.width}x${reference.height}',
      'candidateWasResized':
          decodedCandidate.width != reference.width ||
          decodedCandidate.height != reference.height,
      'meanAbsoluteError': totalError / pixelCount,
      'pixelsOver12': materiallyDifferent,
      'pixelsOver12Percent': materiallyDifferent / pixelCount * 100,
      'overlay': '${output.path}/overlay.png',
      'difference': '${output.path}/difference.png',
    }),
  );
}
