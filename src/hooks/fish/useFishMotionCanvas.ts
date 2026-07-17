import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  drawFishMotionFrame,
  FISH_MOTION_FIRST_FRAME,
  FISH_MOTION_FPS,
  FISH_MOTION_LAST_FRAME,
  FISH_MOTION_PLAYBACK_RATE,
  FISH_MOTION_STILL_FRAME,
  type FishMotionViewport,
} from '../../components/fish/fishMotionRenderer';
import type { FishMotionScene } from '../../models/services/fishMotionScene';

const FRAME_INTERVAL_MS = 1000 / FISH_MOTION_FPS;
const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadFishImage(imagePath: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(imagePath);
  if (cached) return cached;

  const pending = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = imagePath;
  });
  imageCache.set(imagePath, pending);
  return pending;
}

function wrapFrame(frame: number): number {
  const frameCount = FISH_MOTION_LAST_FRAME - FISH_MOTION_FIRST_FRAME + 1;
  return FISH_MOTION_FIRST_FRAME
    + ((frame - FISH_MOTION_FIRST_FRAME) % frameCount + frameCount) % frameCount;
}

interface UseFishMotionCanvasOptions {
  active: boolean;
  scene: FishMotionScene;
}

interface UseFishMotionCanvasResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  failedFishCount: number;
}

export function useFishMotionCanvas({
  active,
  scene,
}: UseFishMotionCanvasOptions): UseFishMotionCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failedLoad, setFailedLoad] = useState<{
    scene: FishMotionScene | null;
    count: number;
  }>({ scene: null, count: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || scene.swimmers.length === 0 || !canvas) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    let cancelled = false;
    let animationFrameId: number | null = null;
    let previousTime = 0;
    let lastDrawTime = 0;
    let elapsedSeconds = 0;
    let imagesReady = false;
    let viewport: FishMotionViewport = { width: 0, height: 0 };
    const images = new Map<string, HTMLImageElement>();
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const draw = (animate: boolean) => {
      if (!imagesReady || viewport.width === 0 || viewport.height === 0) return;
      const frame = animate
        ? wrapFrame(
          FISH_MOTION_STILL_FRAME
          + elapsedSeconds * FISH_MOTION_FPS * FISH_MOTION_PLAYBACK_RATE,
        )
        : FISH_MOTION_STILL_FRAME;
      drawFishMotionFrame(context, scene, images, viewport, {
        elapsedSeconds: animate ? elapsedSeconds : 0,
        frame,
        animateCaustics: animate,
      });
    };

    const stopAnimation = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      previousTime = 0;
      lastDrawTime = 0;
    };

    const tick = (now: number) => {
      if (cancelled || document.hidden || reducedMotionQuery.matches) {
        animationFrameId = null;
        return;
      }

      if (previousTime === 0) previousTime = now;
      if (lastDrawTime === 0 || now - lastDrawTime >= FRAME_INTERVAL_MS) {
        elapsedSeconds += Math.min(0.1, (now - previousTime) / 1000);
        previousTime = now;
        lastDrawTime = now;
        draw(true);
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    const updatePlayback = () => {
      stopAnimation();
      if (!imagesReady || viewport.width === 0 || viewport.height === 0 || document.hidden) {
        return;
      }
      if (images.size === 0) {
        draw(false);
        return;
      }
      if (reducedMotionQuery.matches) {
        draw(false);
        return;
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(0, rect.width);
      const height = Math.max(0, rect.height);
      if (width === 0 || height === 0) return;

      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const backingWidth = Math.round(width * dpr);
      const backingHeight = Math.round(height * dpr);
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewport = { width, height };
      updatePlayback();
    };

    const handleVisibilityChange = () => updatePlayback();
    const handleReducedMotionChange = (_event: MediaQueryListEvent) => updatePlayback();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateCanvasSize);
    if (resizeObserver) resizeObserver.observe(canvas);
    else window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();

    const imagePaths = Array.from(new Set(scene.swimmers.map((sprite) => sprite.imagePath)));
    void Promise.all(imagePaths.map(async (imagePath) => ({
      imagePath,
      image: await loadFishImage(imagePath),
    }))).then((results) => {
      if (cancelled) return;
      const failedPaths = new Set<string>();
      for (const result of results) {
        if (result.image) images.set(result.imagePath, result.image);
        else failedPaths.add(result.imagePath);
      }
      setFailedLoad({
        scene,
        count: scene.swimmers.filter((sprite) => failedPaths.has(sprite.imagePath)).length,
      });
      imagesReady = true;
      updatePlayback();
    });

    return () => {
      cancelled = true;
      stopAnimation();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', updateCanvasSize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, [active, scene]);

  return {
    canvasRef,
    failedFishCount: failedLoad.scene === scene ? failedLoad.count : 0,
  };
}
