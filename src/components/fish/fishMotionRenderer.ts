import type { FishMotionScene, FishMotionSprite } from '../../models/services/fishMotionScene';

export const FISH_MOTION_FPS = 13;
export const FISH_MOTION_PLAYBACK_RATE = 0.05;
export const SWIM_SPEED_MULTIPLIER = 2;
export const FISH_MOTION_FIRST_FRAME = 1;
export const FISH_MOTION_LAST_FRAME = 278;
export const FISH_MOTION_STILL_FRAME = 17;

const MESH_MIN_X = -2.6553857;
const MESH_MAX_X = 0.1898954;
const DRIVER_MULTIPLIER = -1;
const TIME_OFFSET = 1;
const TIME_DIVIDER = 48;
const MOTION_DELAY = 0.05;
const SCALE_X = 0.2;
const MOVEMENT_SCALE = 2;
const WAVE_FREQUENCY = 15;
const WAVE_SCALE = 10;
const ROTATION_CENTER_X = -2.5;
const NOISE_GAP = 2;
const DRIFT_STRENGTH = 0.57;
const DEPTH_STRENGTH = 0.08;
const SLICE_WIDTH_SCALE = 1.25;
const REFERENCE_FISH_LENGTH_CM = 10;
const BASE_BODY_WIDTH_VIEWPORT_RATIO = 0.17;
const MIN_BASE_BODY_WIDTH = 42;
const MAX_BASE_BODY_WIDTH = 74;
const BODY_HEIGHT_RATIO = 0.78;
const HORIZONTAL_BODY_INSET = 0.62;
const VERTICAL_DRIFT_INSET = 0.12;
const GAP_PATTERN_LENGTH = 8;
const MIN_OFFSCREEN_GAP_SECONDS = 1.5;
const MAX_OFFSCREEN_GAP_SECONDS = 4;
const PACE_VARIATION = 0.15;
const MAX_PITCH_RADIANS = Math.PI / 15;

const LANE_Y_BANDS: Readonly<Record<FishMotionSprite['lane'], readonly [number, number]>> = {
  top: [0.14, 0.5],
  middle: [0.28, 0.72],
  bottom: [0.5, 0.86],
};

export interface FishMotionPoint {
  x: number;
  y: number;
  depth: number;
}

export interface FishMotionViewport {
  width: number;
  height: number;
}

export interface FishMotionFrame {
  elapsedSeconds: number;
  frame: number;
  animateCaustics: boolean;
}

export interface FishBodyDimensions {
  width: number;
  height: number;
}

export interface FishSwimPose {
  x: number;
  y: number;
  facingScale: number;
  pitch: number;
}

interface FishSwimLeg {
  index: number;
  elapsedSeconds: number;
}

interface VerticalRoutePose {
  y: number;
  derivative: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateFishBodyDimensions(
  viewport: FishMotionViewport,
  lengthCm: number | undefined,
): FishBodyDimensions {
  const resolvedLengthCm = lengthCm !== undefined
    && Number.isFinite(lengthCm)
    && lengthCm > 0
    ? lengthCm
    : REFERENCE_FISH_LENGTH_CM;
  const baseWidth = clamp(
    viewport.width * BASE_BODY_WIDTH_VIEWPORT_RATIO,
    MIN_BASE_BODY_WIDTH,
    MAX_BASE_BODY_WIDTH,
  );
  const width = baseWidth * Math.sqrt(resolvedLengthCm / REFERENCE_FISH_LENGTH_CM);

  return {
    width,
    height: width * BODY_HEIGHT_RATIO,
  };
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash(value: number, seed: number): number {
  return fract(Math.sin(value * 127.1 + seed * 311.7) * 43758.5453123);
}

function fade(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function noise(value: number, seed: number): number {
  const integer = Math.floor(value);
  const decimal = value - integer;
  const amount = fade(decimal);
  const a = hash(integer, seed);
  const b = hash(integer + 1, seed);
  return a + (b - a) * amount;
}

function noiseColor(time: number): readonly [number, number, number] {
  return [noise(time, 11), noise(time, 29), noise(time, 47)];
}

export function calculateFishMotionPoint(
  modelX: number,
  frame: number,
): FishMotionPoint {
  const drivenTime = TIME_OFFSET + frame * DRIVER_MULTIPLIER / TIME_DIVIDER;
  const distance = Math.abs(modelX);
  const delayedTime = drivenTime + Math.pow(distance, 1.5) * MOTION_DELAY;
  const a = noiseColor(delayedTime).map((value) => value - 0.5);
  const b = noiseColor(delayedTime + NOISE_GAP).map((value) => value - 0.5);
  const directionX = a[0] - b[0];
  const directionY = a[1] - b[1];
  const heading = Math.atan2(directionY, directionX);
  const wave = Math.sin(delayedTime * WAVE_FREQUENCY) * WAVE_SCALE;
  const rotation = heading + wave;
  const localX = modelX - ROTATION_CENTER_X;

  return {
    x: ROTATION_CENTER_X + Math.cos(rotation) * localX + a[0] * MOVEMENT_SCALE,
    y: Math.sin(rotation) * localX + a[1] * MOVEMENT_SCALE,
    depth: a[2],
  };
}

function routeUnit(pathSeed: number, legIndex: number, salt: number): number {
  return hash(legIndex * 19 + salt, pathSeed);
}

function calculateGapDuration(pathSeed: number, patternIndex: number): number {
  return MIN_OFFSCREEN_GAP_SECONDS
    + routeUnit(pathSeed, patternIndex, 101)
      * (MAX_OFFSCREEN_GAP_SECONDS - MIN_OFFSCREEN_GAP_SECONDS);
}

function locateSwimLeg(
  motion: FishMotionSprite['motion'],
  elapsedSeconds: number,
  crossingDuration: number,
): FishSwimLeg {
  let patternDuration = crossingDuration * GAP_PATTERN_LENGTH;
  for (let index = 0; index < GAP_PATTERN_LENGTH; index += 1) {
    patternDuration += calculateGapDuration(motion.pathSeed, index);
  }

  const timelineSeconds = Math.max(
    0,
    elapsedSeconds + motion.timelineOffset * crossingDuration,
  );
  const patternCycle = Math.floor(timelineSeconds / patternDuration);
  let remainingSeconds = timelineSeconds - patternCycle * patternDuration;

  for (let index = 0; index < GAP_PATTERN_LENGTH; index += 1) {
    const legDuration = crossingDuration
      + calculateGapDuration(motion.pathSeed, index);
    if (remainingSeconds < legDuration || index === GAP_PATTERN_LENGTH - 1) {
      return {
        index: patternCycle * GAP_PATTERN_LENGTH + index,
        elapsedSeconds: remainingSeconds,
      };
    }
    remainingSeconds -= legDuration;
  }

  return { index: 0, elapsedSeconds: 0 };
}

function calculateLegDirection(
  motion: FishMotionSprite['motion'],
  legIndex: number,
): -1 | 1 {
  const interval = Math.max(1, Math.floor(motion.reversalInterval));
  const offset = clamp(Math.floor(motion.reversalOffset), 0, interval - 1);
  const reversals = Math.floor((legIndex + offset) / interval);
  return reversals % 2 === 0
    ? motion.initialDirection
    : motion.initialDirection === 1 ? -1 : 1;
}

function calculatePacedProgress(
  pathSeed: number,
  legIndex: number,
  progress: number,
): number {
  const paceDirection = routeUnit(pathSeed, legIndex, 31) < 0.5 ? -1 : 1;
  return progress + paceDirection * PACE_VARIATION
    * Math.sin(progress * Math.PI * 2) / (Math.PI * 2);
}

function calculateVerticalRoute(
  sprite: Pick<FishMotionSprite, 'lane' | 'motion'>,
  legIndex: number,
  progress: number,
  viewport: FishMotionViewport,
  bodyWidth: number,
  bodyHeight: number,
): VerticalRoutePose {
  const [laneStart, laneEnd] = LANE_Y_BANDS[sprite.lane];
  const verticalInset = Math.min(
    bodyHeight / 2 + bodyWidth * VERTICAL_DRIFT_INSET,
    viewport.height / 2,
  );
  const laneTop = clamp(
    viewport.height * laneStart,
    verticalInset,
    viewport.height - verticalInset,
  );
  const laneBottom = clamp(
    viewport.height * laneEnd,
    laneTop,
    viewport.height - verticalInset,
  );
  const availableLaneHeight = Math.max(0, laneBottom - laneTop);
  const verticalSpan = Math.min(
    viewport.height * clamp(sprite.motion.verticalSpan, 0.18, 0.28),
    availableLaneHeight,
  );
  const routeCenter = laneTop + verticalSpan / 2
    + Math.max(0, availableLaneHeight - verticalSpan)
      * routeUnit(sprite.motion.pathSeed, legIndex, 41);
  const routeTop = routeCenter - verticalSpan / 2;
  const routeBottom = routeCenter + verticalSpan / 2;
  const entryY = routeCenter + (
    routeUnit(sprite.motion.pathSeed, legIndex, 42) - 0.5
  ) * verticalSpan * 0.3;
  const exitY = routeCenter + (
    routeUnit(sprite.motion.pathSeed, legIndex, 43) - 0.5
  ) * verticalSpan * 0.3;
  const startsUpward = routeUnit(sprite.motion.pathSeed, legIndex, 44) < 0.5;
  const anchors = startsUpward
    ? [entryY, routeTop, routeBottom, exitY]
    : [entryY, routeBottom, routeTop, exitY];
  const scaledProgress = clamp(progress, 0, 1) * 3;
  const segment = Math.min(2, Math.floor(scaledProgress));
  const localProgress = scaledProgress - segment;
  const easedProgress = localProgress * localProgress * (3 - 2 * localProgress);
  const derivative = 6 * localProgress * (1 - localProgress) * 3;
  const startY = anchors[segment];
  const endY = anchors[segment + 1];

  return {
    y: startY + (endY - startY) * easedProgress,
    derivative: (endY - startY) * derivative,
  };
}

export function calculateSwimPose(
  sprite: Pick<FishMotionSprite, 'lane' | 'motion'>,
  elapsedSeconds: number,
  viewport: FishMotionViewport,
  bodyWidth: number,
  bodyHeight: number,
): FishSwimPose {
  const horizontalInset = Math.min(bodyWidth * HORIZONTAL_BODY_INSET, viewport.width / 2);
  const travelDistance = viewport.width + horizontalInset * 2;
  const crossingDuration = travelDistance
    / Math.max(0.1, sprite.motion.cruiseSpeed * SWIM_SPEED_MULTIPLIER);
  const leg = locateSwimLeg(sprite.motion, elapsedSeconds, crossingDuration);
  const direction = calculateLegDirection(sprite.motion, leg.index);
  const isCrossing = leg.elapsedSeconds < crossingDuration;
  const rawProgress = isCrossing
    ? clamp(leg.elapsedSeconds / crossingDuration, 0, 1)
    : 1;
  const progress = isCrossing
    ? calculatePacedProgress(sprite.motion.pathSeed, leg.index, rawProgress)
    : 1;
  const startX = direction === 1 ? -horizontalInset : viewport.width + horizontalInset;
  const endX = direction === 1 ? viewport.width + horizontalInset : -horizontalInset;
  const route = calculateVerticalRoute(
    sprite,
    leg.index,
    progress,
    viewport,
    bodyWidth,
    bodyHeight,
  );
  const pitch = isCrossing
    ? clamp(
      Math.atan2(direction * route.derivative, travelDistance),
      -MAX_PITCH_RADIANS,
      MAX_PITCH_RADIANS,
    )
    : 0;

  return {
    x: startX + (endX - startX) * progress,
    y: route.y,
    facingScale: direction,
    pitch,
  };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

export function calculateEdgeAlpha(
  centerX: number,
  viewportWidth: number,
  halfWidth: number,
  fadeWidth = 14,
): number {
  const left = smoothstep(-halfWidth, fadeWidth, centerX);
  const right = 1 - smoothstep(viewportWidth - fadeWidth, viewportWidth + halfWidth, centerX);
  return clamp(left * right, 0, 1);
}

function drawCaustics(
  context: CanvasRenderingContext2D,
  viewport: FishMotionViewport,
  frame: number,
): void {
  const rowCount = 5;
  const spacing = viewport.height / (rowCount + 0.5);
  const amplitude = clamp(viewport.height * 0.018, 2.5, 4.5);

  context.save();
  context.strokeStyle = '#c8fff6';
  context.globalAlpha = 0.055;
  context.lineWidth = 1.1;
  for (let row = 0; row < rowCount; row += 1) {
    context.beginPath();
    for (let x = -24; x <= viewport.width + 24; x += 14) {
      const y = 36 + row * spacing + Math.sin(
        x * 0.022 + row * 1.9 + frame / 24,
      ) * amplitude;
      if (x === -24) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function drawFish(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sprite: FishMotionSprite,
  viewport: FishMotionViewport,
  elapsedSeconds: number,
  frame: number,
): void {
  const { width: bodySpan, height: baseHeight } = calculateFishBodyDimensions(
    viewport,
    sprite.lengthCm,
  );
  const slices = Math.round(clamp(bodySpan * 0.5, 24, 40));
  const stripSourceWidth = image.naturalWidth / slices;
  const pxPerUnit = bodySpan / 30;
  const phaseFrame = frame + sprite.bodyPhase * 20;
  const pose = calculateSwimPose(
    sprite,
    elapsedSeconds,
    viewport,
    bodySpan,
    baseHeight,
  );
  const centerX = pose.x;
  const centerY = pose.y;
  const edgeAlpha = calculateEdgeAlpha(centerX, viewport.width, bodySpan / 2);
  if (edgeAlpha <= 0) return;

  const points: FishMotionPoint[] = [];
  for (let index = 0; index < slices; index += 1) {
    const u = (index + 0.5) / slices;
    const originalX = (MESH_MIN_X + (MESH_MAX_X - MESH_MIN_X) * u) * SCALE_X;
    points.push(calculateFishMotionPoint(originalX, phaseFrame));
  }

  const anchor = calculateFishMotionPoint(ROTATION_CENTER_X, phaseFrame);
  const driftX = (anchor.x - ROTATION_CENTER_X) * pxPerUnit * DRIFT_STRENGTH;
  const driftY = -anchor.y * pxPerUnit * DRIFT_STRENGTH;
  const alpha = edgeAlpha * (0.86 + sprite.depth * 0.14);

  context.save();
  context.globalAlpha = alpha * 0.16;
  context.filter = `blur(${Math.max(3, bodySpan * 0.08)}px)`;
  context.fillStyle = '#031b2d';
  context.beginPath();
  context.ellipse(
    centerX,
    centerY + bodySpan * 0.27,
    bodySpan * 0.31 * Math.max(0.25, Math.abs(pose.facingScale)),
    Math.max(2, bodySpan * 0.045),
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();

  context.save();
  context.globalAlpha = alpha;
  context.translate(centerX + driftX, centerY + driftY);
  context.rotate(pose.pitch);
  context.scale(pose.facingScale, 1);

  for (let index = 0; index < slices; index += 1) {
    const point = points[index];
    const screenX = (point.x - anchor.x) * pxPerUnit
      + (index / slices - 0.5) * bodySpan;
    const screenY = -(point.y - anchor.y) * pxPerUnit;
    const depthScale = 1 + point.depth * DEPTH_STRENGTH;
    const sourceX = index * stripSourceWidth;
    const drawWidth = Math.max(1, (bodySpan / slices) * SLICE_WIDTH_SCALE);

    context.save();
    context.translate(screenX, screenY);
    context.scale(depthScale, depthScale);
    context.drawImage(
      image,
      sourceX,
      0,
      stripSourceWidth + 1,
      image.naturalHeight,
      -drawWidth / 2,
      -baseHeight / 2,
      drawWidth + 1,
      baseHeight,
    );
    context.restore();
  }

  context.restore();
}

export function drawFishMotionFrame(
  context: CanvasRenderingContext2D,
  scene: FishMotionScene,
  images: ReadonlyMap<string, HTMLImageElement>,
  viewport: FishMotionViewport,
  motion: FishMotionFrame,
): void {
  context.clearRect(0, 0, viewport.width, viewport.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  drawCaustics(
    context,
    viewport,
    motion.animateCaustics ? motion.frame : FISH_MOTION_STILL_FRAME,
  );

  const orderedSwimmers = [...scene.swimmers].sort((a, b) => a.depth - b.depth);
  for (const sprite of orderedSwimmers) {
    const image = images.get(sprite.imagePath);
    if (!image) continue;
    drawFish(
      context,
      image,
      sprite,
      viewport,
      motion.elapsedSeconds,
      motion.frame,
    );
  }
}
