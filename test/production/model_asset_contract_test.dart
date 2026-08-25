import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const assets = <String, String>{
    'assets/models/fish_detector.onnx':
        '84aca2b5d45dec8c3e4d045d419850e9cf765240fa6a1603fa60e68457157004',
    'assets/models/species_classifier.onnx':
        'e1627d87a85dc55a25e485b7a01ffaa1c206558753ed6d0268b5e1d34029c2c8',
    'assets/models/water_clarity.onnx':
        '9c32530b9787512b6514fefcb78e9225c0156549f32d0219f3627f40bf266c7a',
  };

  test('approved ONNX assets exist with exact release checksums', () async {
    for (final entry in assets.entries) {
      final file = File(entry.key);
      expect(file.existsSync(), isTrue, reason: 'Missing ${entry.key}');
      final digest = await sha256.bind(file.openRead()).first;
      expect(digest.toString(), entry.value, reason: entry.key);
    }
  });

  test('training metadata preserves the deployed graph contract', () async {
    final detector = await _metadata(
      'assets/models/fish_detection_metadata.json',
    );
    final classifier = await _metadata(
      'assets/models/species_classifier_metadata.json',
    );
    final clarity = await _metadata('assets/models/turbidity_metadata.json');

    expect(_at(detector, ['input', 'shape']), [1, 3, 576, 576]);
    expect(_at(detector, ['outputs', 'dets', 'name']), 'dets');
    expect(_at(detector, ['outputs', 'dets', 'shape']), [1, 300, 4]);
    expect(_at(detector, ['outputs', 'labels', 'shape']), [1, 300, 2]);
    expect(_at(classifier, ['input', 'shape']), ['batch_size', 3, 224, 224]);
    expect(_at(classifier, ['output', 'shape']), ['batch_size', 24]);
    expect(_at(clarity, ['input', 'shape']), [1, 3, 224, 224]);
    expect(_at(clarity, ['output', 'shape']), [1, 11]);
  });
}

Future<Map<String, Object?>> _metadata(String path) async {
  final decoded = jsonDecode(await File(path).readAsString());
  return Map<String, Object?>.from(decoded as Map);
}

Object? _at(Map<String, Object?> source, List<String> path) {
  Object? value = source;
  for (final key in path) {
    value = (value as Map)[key];
  }
  return value;
}
