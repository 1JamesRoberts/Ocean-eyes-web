/// <reference lib="webworker" />

import * as ort from 'onnxruntime-web/webgpu';
import type { AIDetection, AIDetectionResult, AITurbidityResult } from '../../types/aquarium';
import { calculateTurbidity, displayClassName, indexOfMaximum, sigmoid, softmax } from './inferenceMath';
import {
  DETECTION_INPUT_SIZE,
  IMAGE_NET_MEAN,
  IMAGE_NET_STD,
  MODEL_PATHS,
  MODEL_VERSION,
  SPECIES_CLASSES,
  SPECIES_CONFIDENCE_THRESHOLD,
  SPECIES_INPUT_SIZE,
  SPECIES_RESIZE_SIZE,
  TURBIDITY_INPUT_SIZE,
} from './modelConfig';
import type { InferenceRequest, InferenceResponse } from './workerProtocol';

type Provider = 'webgpu' | 'wasm';

interface LoadedSession {
  session: ort.InferenceSession;
  provider: Provider;
}

interface PixelSource {
  image: ImageBitmap;
  width: number;
  height: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const workerScope = self as DedicatedWorkerGlobalScope;

ort.env.wasm.proxy = false;
ort.env.wasm.numThreads = workerScope.crossOriginIsolated
  ? Math.min(4, workerScope.navigator.hardwareConcurrency || 1)
  : 1;

let detectionSessionPromise: Promise<LoadedSession> | null = null;
let speciesSessionPromise: Promise<LoadedSession> | null = null;
let turbiditySessionPromise: Promise<LoadedSession> | null = null;
let inferenceQueue = Promise.resolve();

function modelUrl(path: string): string {
  const url = new URL(path, workerScope.location.origin);
  url.searchParams.set('v', MODEL_VERSION);
  return url.href;
}

async function createSession(path: string): Promise<LoadedSession> {
  const commonOptions: ort.InferenceSession.SessionOptions = {
    executionMode: 'sequential',
    graphOptimizationLevel: 'all',
  };

  if ('gpu' in workerScope.navigator) {
    try {
      const session = await ort.InferenceSession.create(modelUrl(path), {
        ...commonOptions,
        executionProviders: ['webgpu', 'wasm'],
      });
      return { session, provider: 'webgpu' };
    } catch (error) {
      console.warn('[OceanEyes AI] WebGPU unavailable for this model; using WASM.', error);
    }
  }

  const session = await ort.InferenceSession.create(modelUrl(path), {
    ...commonOptions,
    executionProviders: ['wasm'],
  });
  return { session, provider: 'wasm' };
}

function getDetectionSession(): Promise<LoadedSession> {
  detectionSessionPromise ??= createSession(MODEL_PATHS.detection);
  return detectionSessionPromise;
}

function getSpeciesSession(): Promise<LoadedSession> {
  speciesSessionPromise ??= createSession(MODEL_PATHS.species);
  return speciesSessionPromise;
}

function getTurbiditySession(): Promise<LoadedSession> {
  turbiditySessionPromise ??= createSession(MODEL_PATHS.turbidity);
  return turbiditySessionPromise;
}

async function decodeImage(image: Blob): Promise<PixelSource> {
  const bitmap = await createImageBitmap(image);
  return { image: bitmap, width: bitmap.width, height: bitmap.height };
}

function renderPixels(
  source: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
  sourceRectangle?: Rectangle
): ImageData {
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser cannot prepare camera frames for AI');

  if (sourceRectangle) {
    context.drawImage(
      source,
      sourceRectangle.x,
      sourceRectangle.y,
      sourceRectangle.width,
      sourceRectangle.height,
      0,
      0,
      targetWidth,
      targetHeight
    );
  } else {
    context.drawImage(source, 0, 0, targetWidth, targetHeight);
  }
  return context.getImageData(0, 0, targetWidth, targetHeight);
}

function toNchw(
  imageData: ImageData,
  normalize: boolean
): Float32Array {
  const pixelCount = imageData.width * imageData.height;
  const tensor = new Float32Array(pixelCount * 3);
  const pixels = imageData.data;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const scaled = pixels[pixel * 4 + channel] / 255;
      tensor[channel * pixelCount + pixel] = normalize
        ? (scaled - IMAGE_NET_MEAN[channel]) / IMAGE_NET_STD[channel]
        : scaled;
    }
  }
  return tensor;
}

function fullFrameTensor(source: PixelSource, size: number, normalize: boolean): ort.Tensor {
  const imageData = renderPixels(source.image, size, size);
  return new ort.Tensor('float32', toNchw(imageData, normalize), [1, 3, size, size]);
}

function speciesTensor(source: PixelSource, rectangle: Rectangle): ort.Tensor {
  const resizedCanvas = new OffscreenCanvas(SPECIES_RESIZE_SIZE, SPECIES_RESIZE_SIZE);
  const resizedContext = resizedCanvas.getContext('2d');
  if (!resizedContext) throw new Error('This browser cannot prepare fish crops for AI');
  resizedContext.drawImage(
    source.image,
    rectangle.x,
    rectangle.y,
    rectangle.width,
    rectangle.height,
    0,
    0,
    SPECIES_RESIZE_SIZE,
    SPECIES_RESIZE_SIZE
  );

  const cropStart = Math.trunc((SPECIES_RESIZE_SIZE - SPECIES_INPUT_SIZE) / 2);
  const imageData = renderPixels(resizedCanvas, SPECIES_INPUT_SIZE, SPECIES_INPUT_SIZE, {
    x: cropStart,
    y: cropStart,
    width: SPECIES_INPUT_SIZE,
    height: SPECIES_INPUT_SIZE,
  });
  return new ort.Tensor('float32', toNchw(imageData, true), [1, 3, SPECIES_INPUT_SIZE, SPECIES_INPUT_SIZE]);
}

function tensorData(tensor: ort.Tensor): Float32Array {
  if (!(tensor.data instanceof Float32Array)) {
    throw new Error(`Unexpected AI output type: ${tensor.type}`);
  }
  return tensor.data;
}

async function classifySpecies(
  source: PixelSource,
  rectangle: Rectangle,
  loadedSession: LoadedSession
): Promise<Omit<AIDetection, 'bbox' | 'bbox_normalized' | 'detection_confidence'>> {
  const input = speciesTensor(source, rectangle);
  const outputs = await loadedSession.session.run({ input });
  const logits = tensorData(outputs.output);
  const probabilities = softmax(logits);
  const topIndex = indexOfMaximum(probabilities);
  const confidence = probabilities[topIndex];
  const species = SPECIES_CLASSES[topIndex];

  return {
    species,
    species_display: displayClassName(species),
    confidence: Math.round(confidence * 10_000) / 10_000,
    below_threshold: confidence < SPECIES_CONFIDENCE_THRESHOLD,
    threshold: SPECIES_CONFIDENCE_THRESHOLD,
    diagnosis: null,
  };
}

async function detectFish(image: Blob, confidenceThreshold: number): Promise<AIDetectionResult> {
  const source = await decodeImage(image);
  try {
    const [detection, species] = await Promise.all([getDetectionSession(), getSpeciesSession()]);
    const input = fullFrameTensor(source, DETECTION_INPUT_SIZE, true);
    const outputs = await detection.session.run({ input });
    const boxes = tensorData(outputs.dets);
    const labels = tensorData(outputs.labels);
    const queryCount = outputs.dets.dims[1] ?? 0;
    const classCount = outputs.labels.dims[2] ?? 1;
    const detections: AIDetection[] = [];
    const speciesCounts: Record<string, number> = {};

    for (let query = 0; query < queryCount; query += 1) {
      let highestLogit = Number.NEGATIVE_INFINITY;
      for (let classIndex = 0; classIndex < classCount; classIndex += 1) {
        highestLogit = Math.max(highestLogit, labels[query * classCount + classIndex]);
      }
      const detectionConfidence = sigmoid(highestLogit);
      if (detectionConfidence < confidenceThreshold) continue;

      const boxOffset = query * 4;
      const centerX = boxes[boxOffset] * source.width;
      const centerY = boxes[boxOffset + 1] * source.height;
      const width = boxes[boxOffset + 2] * source.width;
      const height = boxes[boxOffset + 3] * source.height;
      const x1 = Math.max(0, Math.min(source.width, Math.trunc(centerX - width / 2)));
      const y1 = Math.max(0, Math.min(source.height, Math.trunc(centerY - height / 2)));
      const x2 = Math.max(0, Math.min(source.width, Math.trunc(centerX + width / 2)));
      const y2 = Math.max(0, Math.min(source.height, Math.trunc(centerY + height / 2)));
      if (x2 <= x1 || y2 <= y1) continue;

      const classification = await classifySpecies(
        source,
        { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
        species
      );
      const countKey = classification.below_threshold ? 'unknown' : classification.species;
      speciesCounts[countKey] = (speciesCounts[countKey] ?? 0) + 1;
      detections.push({
        bbox: [x1, y1, x2, y2],
        bbox_normalized: [
          Math.round((x1 / source.width) * 10_000) / 10_000,
          Math.round((y1 / source.height) * 10_000) / 10_000,
          Math.round((x2 / source.width) * 10_000) / 10_000,
          Math.round((y2 / source.height) * 10_000) / 10_000,
        ],
        detection_confidence: Math.round(detectionConfidence * 10_000) / 10_000,
        ...classification,
      });
    }

    return {
      timestamp: new Date().toISOString(),
      image_dimensions: { width: source.width, height: source.height },
      models: {
        detection: { provider: detection.provider },
        species: { provider: species.provider },
      },
      detections,
      summary: { total_detections: detections.length, species_counts: speciesCounts },
    };
  } finally {
    source.image.close();
  }
}

async function measureTurbidity(image: Blob): Promise<AITurbidityResult> {
  const source = await decodeImage(image);
  try {
    const loadedSession = await getTurbiditySession();
    try {
      const images = fullFrameTensor(source, TURBIDITY_INPUT_SIZE, false);
      const outputs = await loadedSession.session.run({ images });
      const probabilities = tensorData(outputs.output0);

      return {
        timestamp: new Date().toISOString(),
        image_dimensions: { width: source.width, height: source.height },
        models: { turbidity: { provider: loadedSession.provider } },
        turbidity: calculateTurbidity(probabilities),
      };
    } finally {
      await loadedSession.session.release();
      turbiditySessionPromise = null;
    }
  } finally {
    source.image.close();
  }
}

async function processRequest(request: InferenceRequest): Promise<void> {
  let response: InferenceResponse;
  try {
    const result = request.operation === 'detect'
      ? await detectFish(request.image, request.confidence)
      : await measureTurbidity(request.image);
    response = { id: request.id, ok: true, result };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    response = {
      id: request.id,
      ok: false,
      error: `On-device AI could not run: ${detail}`,
    };
  }
  workerScope.postMessage(response);
}

workerScope.addEventListener('message', (event: MessageEvent<InferenceRequest>) => {
  const request = event.data;
  inferenceQueue = inferenceQueue.then(() => processRequest(request));
});
