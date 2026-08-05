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
