import 'dart:math' as math;

import 'aquarium_models.dart';
import 'classifiable_species.dart';
import 'fish_insights_service.dart';

const int maxFishMotionSwimmers = 12;
const double fishMotionFps = 13;
const double fishMotionPlaybackRate = 0.05;
const double fishMotionStillFrame = 17;
const double fishMotionFirstFrame = 1;
const double fishMotionLastFrame = 278;

enum FishSwimLane { top, middle, bottom }

class FishMotionProfile {
  const FishMotionProfile({
    required this.pathSeed,
    required this.initialDirection,
    required this.cruiseSpeed,
    required this.timelineOffset,
    required this.verticalSpan,
    required this.reversalInterval,
    required this.reversalOffset,
  });

  final double pathSeed;
  final int initialDirection;
  final double cruiseSpeed;
  final double timelineOffset;
  final double verticalSpan;
  final int reversalInterval;
  final int reversalOffset;
}

class FishMotionSprite {
  const FishMotionSprite({
    required this.key,
    required this.speciesId,
    required this.imagePath,
    required this.lane,
    required this.motion,
    required this.lengthCm,
    required this.bodyPhase,
    required this.depth,
  });

  final String key;
  final String speciesId;
  final String imagePath;
  final FishSwimLane lane;
  final FishMotionProfile motion;
  final double lengthCm;
  final double bodyPhase;
  final double depth;
}

class FishMotionScene {
  const FishMotionScene({
    required this.swimmers,
    required this.overflowCount,
    required this.unsupportedCount,
  });

  final List<FishMotionSprite> swimmers;
  final int overflowCount;
  final int unsupportedCount;
}

class _SupportedInventoryEntry {
  _SupportedInventoryEntry({
    required this.fish,
    required this.count,
    required this.imagePath,
    required this.lane,
    required this.lengthCm,
    required this.index,
  });

  final FishEntry fish;
  final int count;
  final String imagePath;
  final FishSwimLane lane;
  final double lengthCm;
  final int index;
  int allocated = 0;
}

/// Pure, deterministic projection from aquarium inventory to hero swimmers.
abstract final class FishMotionSceneBuilder {
  static FishMotionScene build(
    Iterable<FishEntry> fishList, {
    int maxSwimmers = maxFishMotionSwimmers,
  }) {
    final limit = math.max(0, maxSwimmers);
    final supported = <_SupportedInventoryEntry>[];
    var unsupportedCount = 0;

    var index = 0;
    for (final fish in fishList) {
      final count = math.max(0, fish.count);
      if (count == 0) {
        index += 1;
        continue;
      }

      final classifierId = ClassifiableSpeciesCatalog.resolveId(fish.speciesId);
      final species = _classifiableSpecies(classifierId);
      if (species == null || !_isCuratedMotionAsset(species.assetPath)) {
        unsupportedCount += count;
        index += 1;
        continue;
      }

      final facts =
          FishInsightsService.factsFor(fish.speciesId) ??
          FishInsightsService.factsFor(species.catalogId ?? classifierId);
      supported.add(
        _SupportedInventoryEntry(
          fish: fish,
          count: count,
          imagePath: species.assetPath,
          lane: _laneFor(facts?.swimZone),
          lengthCm: facts?.sizeCm ?? 10,
          index: index,
        ),
      );
      index += 1;
    }

    var remainingSlots = limit;
    for (final entry in supported) {
      if (remainingSlots == 0) break;
      entry.allocated = 1;
      remainingSlots -= 1;
    }
    _allocateRemainingSlots(supported, remainingSlots);

    final swimmers = <FishMotionSprite>[
      for (final entry in supported)
        for (var ordinal = 0; ordinal < entry.allocated; ordinal += 1)
          _createSprite(entry, ordinal),
    ];
    final supportedCount = supported.fold<int>(
      0,
      (sum, entry) => sum + entry.count,
    );

    return FishMotionScene(
      swimmers: List.unmodifiable(swimmers),
      overflowCount: math.max(0, supportedCount - swimmers.length),
      unsupportedCount: unsupportedCount,
    );
  }

  static SpeciesOption? _classifiableSpecies(String speciesId) {
    for (final species in ClassifiableSpeciesCatalog.options) {
      if (species.id == speciesId) return species;
    }
    return null;
  }

  static bool _isCuratedMotionAsset(String imagePath) =>
      imagePath.startsWith('assets/images/fish/') && imagePath.endsWith('.png');

  static FishSwimLane _laneFor(String? value) => switch (value?.toLowerCase()) {
    'top' => FishSwimLane.top,
    'bottom' => FishSwimLane.bottom,
    _ => FishSwimLane.middle,
  };

  static void _allocateRemainingSlots(
    List<_SupportedInventoryEntry> entries,
    int remainingSlots,
  ) {
    final remainingCounts = entries
        .map((entry) => math.max(0, entry.count - entry.allocated))
        .toList(growable: false);
    final remainingTotal = remainingCounts.fold<int>(
      0,
      (sum, count) => sum + count,
    );
    if (remainingSlots <= 0 || remainingTotal <= 0) return;

    final shares = <({_SupportedInventoryEntry entry, double fraction})>[];
    for (var index = 0; index < entries.length; index += 1) {
      final entry = entries[index];
      final exact = remainingSlots * remainingCounts[index] / remainingTotal;
      final base = math.min(remainingCounts[index], exact.floor());
      entry.allocated += base;
      shares.add((entry: entry, fraction: exact - base));
    }

    var slotsLeft =
        remainingSlots -
        shares.fold<int>(
          0,
          (sum, share) => sum + math.max(0, share.entry.allocated - 1),
        );
    shares.sort((first, second) {
      final fractionOrder = second.fraction.compareTo(first.fraction);
      return fractionOrder != 0
          ? fractionOrder
          : first.entry.index.compareTo(second.entry.index);
    });
    while (slotsLeft > 0) {
      var allocatedInPass = false;
      for (final share in shares) {
        if (slotsLeft == 0) break;
        if (share.entry.allocated >= share.entry.count) continue;
        share.entry.allocated += 1;
        slotsLeft -= 1;
        allocatedInPass = true;
      }
      if (!allocatedInPass) break;
    }
  }

  static FishMotionSprite _createSprite(
    _SupportedInventoryEntry entry,
    int ordinal,
  ) {
    final seed = _hashString(
      '${entry.fish.id}:${entry.fish.speciesId}:$ordinal',
    );
    final reversalInterval = 5 + (_unitFromSeed(seed, 8) * 4).floor();
    final baseCruiseSpeed = 7 + _unitFromSeed(seed, 2) * 5;
    return FishMotionSprite(
      key: '${entry.fish.id}:$ordinal',
      speciesId: entry.fish.speciesId,
      imagePath: entry.imagePath,
      lane: entry.lane,
      motion: FishMotionProfile(
        pathSeed: _unitFromSeed(seed, 13) * 1000,
        initialDirection: _unitFromSeed(seed, 1) < 0.5 ? -1 : 1,
        cruiseSpeed: FishMotionMath.calculateSizeAdjustedCruiseSpeed(
          baseCruiseSpeed,
          entry.lengthCm,
        ),
        timelineOffset: _unitFromSeed(seed, 5),
        verticalSpan: 0.18 + _unitFromSeed(seed, 10) * 0.1,
        reversalInterval: reversalInterval,
        reversalOffset: (_unitFromSeed(seed, 9) * reversalInterval).floor(),
      ),
      lengthCm: entry.lengthCm,
      bodyPhase: _unitFromSeed(seed, 4) * math.pi * 2,
      depth: _unitFromSeed(seed, 7),
    );
  }

  static int _hashString(String value) {
    var hash = 2166136261;
    for (final codeUnit in value.codeUnits) {
      hash ^= codeUnit;
      hash = (hash * 16777619) & 0xffffffff;
    }
    return hash;
  }

  static double _unitFromSeed(int seed, int salt) {
    var value = (seed + ((salt * 0x9e3779b1) & 0xffffffff)) & 0xffffffff;
    value ^= value >> 16;
    value = (value * 0x21f0aaad) & 0xffffffff;
    value ^= value >> 15;
    value = (value * 0x735a2d97) & 0xffffffff;
    value ^= value >> 15;
    return (value & 0xffffffff) / 4294967296;
  }
}

class FishMotionViewport {
  const FishMotionViewport({required this.width, required this.height});

  final double width;
  final double height;
}

class FishBodyDimensions {
  const FishBodyDimensions({required this.width, required this.height});

  final double width;
  final double height;
}

class FishSwimPose {
  const FishSwimPose({
    required this.x,
    required this.y,
    required this.facingScale,
    required this.pitch,
  });

  final double x;
  final double y;
  final int facingScale;
  final double pitch;
}

class FishMotionPoint {
  const FishMotionPoint({
    required this.x,
    required this.y,
    required this.depth,
  });

  final double x;
  final double y;
  final double depth;
}

class _FishSwimLeg {
  const _FishSwimLeg({required this.index, required this.elapsedSeconds});

  final int index;
  final double elapsedSeconds;
}

class _VerticalRoutePose {
  const _VerticalRoutePose({required this.y, required this.derivative});

  final double y;
  final double derivative;
}

/// Pure rendering math shared by the hero painter and deterministic tests.
abstract final class FishMotionMath {
  static const double swimSpeedMultiplier = 2;
  static const double meshMinX = -2.6553857;
  static const double meshMaxX = 0.1898954;
  static const double rotationCenterX = -2.5;
  static const double scaleX = 0.2;

  static const double _driverMultiplier = -1;
  static const double _timeOffset = 1;
  static const double _timeDivider = 48;
  static const double _motionDelay = 0.05;
  static const double _movementScale = 2;
  static const double _waveFrequency = 15;
  static const double _waveScale = 10;
  static const double _noiseGap = 2;
  static const double _referenceFishLengthCm = 10;
  static const double _baseBodyWidthViewportRatio = 0.17;
  static const double _minBaseBodyWidth = 42;
  static const double _maxBaseBodyWidth = 74;
  static const double _bodyHeightRatio = 0.78;
  static const double _horizontalBodyInset = 0.62;
  static const double _verticalDriftInset = 0.12;
  static const int _gapPatternLength = 8;
  static const double _minOffscreenGapSeconds = 1.5;
  static const double _maxOffscreenGapSeconds = 4;
  static const double _paceVariation = 0.15;
  static const double _maxPitchRadians = math.pi / 15;

  static double calculateSizeAdjustedCruiseSpeed(
    double baseCruiseSpeed,
    double? lengthCm,
  ) {
    final resolvedLengthCm =
        lengthCm != null && lengthCm.isFinite && lengthCm > 0
        ? lengthCm
        : _referenceFishLengthCm;
    return baseCruiseSpeed *
        math.sqrt(_referenceFishLengthCm / resolvedLengthCm);
  }

  static FishBodyDimensions calculateBodyDimensions(
    FishMotionViewport viewport,
    double? lengthCm,
  ) {
    final resolvedLengthCm =
        lengthCm != null && lengthCm.isFinite && lengthCm > 0
        ? lengthCm
        : _referenceFishLengthCm;
    final baseWidth = (viewport.width * _baseBodyWidthViewportRatio).clamp(
      _minBaseBodyWidth,
      _maxBaseBodyWidth,
    );
    final width =
        baseWidth * math.sqrt(resolvedLengthCm / _referenceFishLengthCm);
    return FishBodyDimensions(width: width, height: width * _bodyHeightRatio);
  }

  static FishMotionPoint calculateMotionPoint(double modelX, double frame) {
    final drivenTime = _timeOffset + frame * _driverMultiplier / _timeDivider;
    final distance = modelX.abs();
    final delayedTime = drivenTime + math.pow(distance, 1.5) * _motionDelay;
    final a = _noiseColor(
      delayedTime,
    ).map((value) => value - 0.5).toList(growable: false);
    final b = _noiseColor(
      delayedTime + _noiseGap,
    ).map((value) => value - 0.5).toList(growable: false);
    final directionX = a[0] - b[0];
    final directionY = a[1] - b[1];
    final heading = math.atan2(directionY, directionX);
    final wave = math.sin(delayedTime * _waveFrequency) * _waveScale;
    final rotation = heading + wave;
    final localX = modelX - rotationCenterX;

    return FishMotionPoint(
      x: rotationCenterX + math.cos(rotation) * localX + a[0] * _movementScale,
      y: math.sin(rotation) * localX + a[1] * _movementScale,
      depth: a[2],
    );
  }

  static FishSwimPose calculateSwimPose(
    FishMotionSprite sprite,
    double elapsedSeconds,
    FishMotionViewport viewport,
    double bodyWidth,
    double bodyHeight,
  ) {
    final horizontalInset = math.min(
      bodyWidth * _horizontalBodyInset,
      viewport.width / 2,
    );
    final travelDistance = viewport.width + horizontalInset * 2;
    final crossingDuration =
        travelDistance /
        math.max(0.1, sprite.motion.cruiseSpeed * swimSpeedMultiplier);
    final leg = _locateSwimLeg(sprite.motion, elapsedSeconds, crossingDuration);
    final direction = _calculateLegDirection(sprite.motion, leg.index);
    final isCrossing = leg.elapsedSeconds < crossingDuration;
    final rawProgress = isCrossing
        ? (leg.elapsedSeconds / crossingDuration).clamp(0.0, 1.0)
        : 1.0;
    final progress = isCrossing
        ? _calculatePacedProgress(
            sprite.motion.pathSeed,
            leg.index,
            rawProgress,
          )
        : 1.0;
    final startX = direction == 1
        ? -horizontalInset
        : viewport.width + horizontalInset;
    final endX = direction == 1
        ? viewport.width + horizontalInset
        : -horizontalInset;
    final route = _calculateVerticalRoute(
      sprite,
      leg.index,
      progress,
      viewport,
      bodyWidth,
      bodyHeight,
    );
    final pitch = isCrossing
        ? math
              .atan2(direction * route.derivative, travelDistance)
              .clamp(-_maxPitchRadians, _maxPitchRadians)
        : 0.0;

    return FishSwimPose(
      x: startX + (endX - startX) * progress,
      y: route.y,
      facingScale: direction,
      pitch: pitch,
    );
  }

  static double calculateEdgeAlpha(
    double centerX,
    double viewportWidth,
    double halfWidth, {
    double fadeWidth = 14,
  }) {
    final left = _smoothstep(-halfWidth, fadeWidth, centerX);
    final right =
        1 -
        _smoothstep(
          viewportWidth - fadeWidth,
          viewportWidth + halfWidth,
          centerX,
        );
    return (left * right).clamp(0.0, 1.0);
  }

  static double wrapFrame(double frame) {
    const frameCount = fishMotionLastFrame - fishMotionFirstFrame + 1;
    return fishMotionFirstFrame +
        (((frame - fishMotionFirstFrame) % frameCount) + frameCount) %
            frameCount;
  }

  static double _fract(double value) => value - value.floor();

  static double _hash(double value, double seed) =>
      _fract(math.sin(value * 127.1 + seed * 311.7) * 43758.5453123);

  static double _fade(double value) =>
      value * value * value * (value * (value * 6 - 15) + 10);

  static double _noise(double value, double seed) {
    final integer = value.floor();
    final decimal = value - integer;
    final amount = _fade(decimal);
    final first = _hash(integer.toDouble(), seed);
    final second = _hash(integer + 1.0, seed);
    return first + (second - first) * amount;
  }

  static List<double> _noiseColor(double time) => [
    _noise(time, 11),
    _noise(time, 29),
    _noise(time, 47),
  ];

  static double _routeUnit(double pathSeed, int legIndex, int salt) =>
      _hash((legIndex * 19 + salt).toDouble(), pathSeed);

  static double _calculateGapDuration(double pathSeed, int patternIndex) =>
      _minOffscreenGapSeconds +
      _routeUnit(pathSeed, patternIndex, 101) *
          (_maxOffscreenGapSeconds - _minOffscreenGapSeconds);

  static _FishSwimLeg _locateSwimLeg(
    FishMotionProfile motion,
    double elapsedSeconds,
    double crossingDuration,
  ) {
    var patternDuration = crossingDuration * _gapPatternLength;
    for (var index = 0; index < _gapPatternLength; index += 1) {
      patternDuration += _calculateGapDuration(motion.pathSeed, index);
    }

    final timelineSeconds = math.max(
      0.0,
      elapsedSeconds + motion.timelineOffset * crossingDuration,
    );
    final patternCycle = (timelineSeconds / patternDuration).floor();
    var remainingSeconds = timelineSeconds - patternCycle * patternDuration;

    for (var index = 0; index < _gapPatternLength; index += 1) {
      final legDuration =
          crossingDuration + _calculateGapDuration(motion.pathSeed, index);
      if (remainingSeconds < legDuration || index == _gapPatternLength - 1) {
        return _FishSwimLeg(
          index: patternCycle * _gapPatternLength + index,
          elapsedSeconds: remainingSeconds,
        );
      }
      remainingSeconds -= legDuration;
    }
    return const _FishSwimLeg(index: 0, elapsedSeconds: 0);
  }

  static int _calculateLegDirection(FishMotionProfile motion, int legIndex) {
    final interval = math.max(1, motion.reversalInterval);
    final offset = motion.reversalOffset.clamp(0, interval - 1);
    final reversals = ((legIndex + offset) / interval).floor();
    if (reversals.isEven) return motion.initialDirection;
    return motion.initialDirection == 1 ? -1 : 1;
  }

  static double _calculatePacedProgress(
    double pathSeed,
    int legIndex,
    double progress,
  ) {
    final paceDirection = _routeUnit(pathSeed, legIndex, 31) < 0.5 ? -1 : 1;
    return progress +
        paceDirection *
            _paceVariation *
            math.sin(progress * math.pi * 2) /
            (math.pi * 2);
  }

  static _VerticalRoutePose _calculateVerticalRoute(
    FishMotionSprite sprite,
    int legIndex,
    double progress,
    FishMotionViewport viewport,
    double bodyWidth,
    double bodyHeight,
  ) {
    final (laneStart, laneEnd) = switch (sprite.lane) {
      FishSwimLane.top => (0.14, 0.5),
      FishSwimLane.middle => (0.28, 0.72),
      FishSwimLane.bottom => (0.5, 0.86),
    };
    final verticalInset = math.min(
      bodyHeight / 2 + bodyWidth * _verticalDriftInset,
      viewport.height / 2,
    );
    final laneTop = (viewport.height * laneStart).clamp(
      verticalInset,
      viewport.height - verticalInset,
    );
    final laneBottom = (viewport.height * laneEnd).clamp(
      laneTop,
      viewport.height - verticalInset,
    );
    final availableLaneHeight = math.max(0.0, laneBottom - laneTop);
    final verticalSpan = math.min(
      viewport.height * sprite.motion.verticalSpan.clamp(0.18, 0.28),
      availableLaneHeight,
    );
    final routeCenter =
        laneTop +
        verticalSpan / 2 +
        math.max(0.0, availableLaneHeight - verticalSpan) *
            _routeUnit(sprite.motion.pathSeed, legIndex, 41);
    final routeTop = routeCenter - verticalSpan / 2;
    final routeBottom = routeCenter + verticalSpan / 2;
    final entryY =
        routeCenter +
        (_routeUnit(sprite.motion.pathSeed, legIndex, 42) - 0.5) *
            verticalSpan *
            0.3;
    final exitY =
        routeCenter +
        (_routeUnit(sprite.motion.pathSeed, legIndex, 43) - 0.5) *
            verticalSpan *
            0.3;
    final startsUpward = _routeUnit(sprite.motion.pathSeed, legIndex, 44) < 0.5;
    final anchors = startsUpward
        ? [entryY, routeTop, routeBottom, exitY]
        : [entryY, routeBottom, routeTop, exitY];
    final scaledProgress = progress.clamp(0.0, 1.0) * 3;
    final segment = math.min(2, scaledProgress.floor());
    final localProgress = scaledProgress - segment;
    final easedProgress =
        localProgress * localProgress * (3 - 2 * localProgress);
    final derivative = 6 * localProgress * (1 - localProgress) * 3;
    final startY = anchors[segment];
    final endY = anchors[segment + 1];

    return _VerticalRoutePose(
      y: startY + (endY - startY) * easedProgress,
      derivative: (endY - startY) * derivative,
    );
  }

  static double _smoothstep(double edge0, double edge1, double value) {
    final amount = ((value - edge0) / (edge1 - edge0)).clamp(0.0, 1.0);
    return amount * amount * (3 - 2 * amount);
  }
}
