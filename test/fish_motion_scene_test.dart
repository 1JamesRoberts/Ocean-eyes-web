import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/models/demo_fixtures.dart';
import 'package:oceaneyes/models/fish_motion_scene.dart';

void main() {
  test('hero scene uses the reference capped proportional allocation', () {
    final scene = FishMotionSceneBuilder.build(DemoFixtures.populatedFish());

    expect(scene.swimmers, hasLength(maxFishMotionSwimmers));
    expect(scene.overflowCount, 8);
    expect(scene.unsupportedCount, 0);
    expect(
      {
        for (final sprite in scene.swimmers)
          sprite.speciesId: scene.swimmers
              .where((candidate) => candidate.speciesId == sprite.speciesId)
              .length,
      },
      {'cardinal_tetra': 5, 'guppy': 3, 'corydoras': 2, 'cherry_barb': 2},
    );
  });

  test('cruise speed follows inverse visual-size scaling', () {
    const baseSpeed = 10.0;
    final smallFish = FishMotionMath.calculateSizeAdjustedCruiseSpeed(
      baseSpeed,
      5,
    );
    final referenceFish = FishMotionMath.calculateSizeAdjustedCruiseSpeed(
      baseSpeed,
      10,
    );
    final largeFish = FishMotionMath.calculateSizeAdjustedCruiseSpeed(
      baseSpeed,
      20,
    );

    expect(smallFish, closeTo(10 * math.sqrt(2), 1e-9));
    expect(referenceFish, closeTo(10, 1e-9));
    expect(largeFish, closeTo(10 / math.sqrt(2), 1e-9));
    expect(smallFish * smallFish * 5, closeTo(1000, 1e-9));
    expect(referenceFish * referenceFish * 10, closeTo(1000, 1e-9));
    expect(largeFish * largeFish * 20, closeTo(1000, 1e-9));
  });

  test('cruise speed falls back to the reference size for invalid lengths', () {
    for (final lengthCm in <double?>[
      null,
      0.0,
      -1.0,
      double.nan,
      double.infinity,
      double.negativeInfinity,
    ]) {
      expect(
        FishMotionMath.calculateSizeAdjustedCruiseSpeed(10, lengthCm),
        closeTo(10, 1e-9),
      );
    }
  });

  test('scene profiles contain size-adjusted seeded cruise speeds', () {
    final scene = FishMotionSceneBuilder.build(DemoFixtures.populatedFish());

    for (final sprite in scene.swimmers) {
      final normalizedBaseSpeed =
          sprite.motion.cruiseSpeed * math.sqrt(sprite.lengthCm / 10);
      expect(normalizedBaseSpeed, greaterThanOrEqualTo(7));
      expect(normalizedBaseSpeed, lessThan(12));
    }
  });

  test('hero scene profiles and render math stay deterministic', () {
    final first = FishMotionSceneBuilder.build(DemoFixtures.populatedFish());
    final second = FishMotionSceneBuilder.build(DemoFixtures.populatedFish());

    for (var index = 0; index < first.swimmers.length; index += 1) {
      final a = first.swimmers[index];
      final b = second.swimmers[index];
      expect(a.key, b.key);
      expect(a.lane, b.lane);
      expect(a.lengthCm, b.lengthCm);
      expect(a.depth, b.depth);
      expect(a.motion.pathSeed, b.motion.pathSeed);
      expect(a.motion.initialDirection, b.motion.initialDirection);
      expect(a.motion.cruiseSpeed, b.motion.cruiseSpeed);
    }

    const viewport = FishMotionViewport(width: 393, height: 221);
    final dimensions = FishMotionMath.calculateBodyDimensions(
      viewport,
      first.swimmers.first.lengthCm,
    );
    final pose = FishMotionMath.calculateSwimPose(
      first.swimmers.first,
      0,
      viewport,
      dimensions.width,
      dimensions.height,
    );
    expect(dimensions.width, greaterThan(42));
    expect(dimensions.height, closeTo(dimensions.width * 0.78, 1e-9));
    expect(pose.x.isFinite, isTrue);
    expect(pose.y, inInclusiveRange(0, viewport.height));
    expect(pose.facingScale.abs(), 1);
  });
}
