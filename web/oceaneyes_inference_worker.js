/// <reference lib="webworker" />

// Pin the runtime so model behavior cannot change independently of an app
// release. ONNX models are always fetched from this Flutter app's own origin.
import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/ort.webgpu.min.mjs';

const scope = self;
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
const IMAGE_NET_MEAN = [0.485, 0.456, 0.406];
const IMAGE_NET_STD = [0.229, 0.224, 0.225];
const SPECIES = [
  'angelfish', 'betta', 'black_skirt_tetra', 'cardinal_tetra',
  'cherry_barb', 'clown_loach', 'corydoras', 'discus', 'dwarf_gourami',
  'german_blue_ram', 'goldfish', 'guppy', 'harlequin_rasbora', 'molly',
  'neon_tetra', 'oscar', 'otocinclus', 'platy', 'plecostomus',
  'rummy_nose_tetra', 'siamese_algae_eater', 'swordtail', 'tiger_barb',
  'zebra_danio',
];
const TURBIDITY_COEFFICIENTS = [
  61.34, 61.57, 62.48, 65.53, 67.76, 73.91,
  77.63, 85.64, 94.0, 102.85, 114.32,
];

ort.env.wasm.proxy = false;
ort.env.wasm.numThreads = scope.crossOriginIsolated
  ? Math.min(4, scope.navigator.hardwareConcurrency || 1)
  : 1;
ort.env.wasm.wasmPaths = ORT_CDN;

let configuration = null;
let queue = Promise.resolve();
let detectorSession = null;
let classifierSession = null;
let claritySession = null;
const cancelled = new Set();

function progress(id, stage, message, model = null, fraction = null) {
  scope.postMessage({ id, type: 'progress', progress: { stage, message, model, fraction } });
}

function assertNotCancelled(id) {
  if (cancelled.has(id)) throw new DOMException('Browser inference was cancelled.', 'AbortError');
}

async function fetchModel(id, name, url) {
  progress(id, 'downloadingModel', `Downloading ${name} model…`, name, 0);
  const response = await fetch(url, { cache: 'force-cache', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${name} model returned HTTP ${response.status}.`);
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body) return response.arrayBuffer();
  const reader = response.body.getReader();
  let bytes = total > 0 ? new Uint8Array(total) : null;
  const chunks = bytes ? null : [];
  let received = 0;
  while (true) {
    assertNotCancelled(id);
    const { done, value } = await reader.read();
    if (done) break;
    if (bytes) {
      if (received + value.byteLength > bytes.byteLength) {
        const expanded = new Uint8Array(
          Math.max(received + value.byteLength, bytes.byteLength * 2),
        );
        expanded.set(bytes);
        bytes = expanded;
      }
      bytes.set(value, received);
    } else {
      chunks.push(value);
    }
    received += value.byteLength;
    progress(
      id,
      'downloadingModel',
      `Downloading ${name} model…`,
      name,
      total > 0 ? received / total : null,
    );
  }
  if (bytes) return (bytes.byteLength === received ? bytes : bytes.slice(0, received)).buffer;
  bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

async function createSession(id, key, preferWebGpu) {
  const model = configuration.models[key];
  const bytes = await fetchModel(id, model.name, model.url);
  assertNotCancelled(id);
  progress(id, 'creatingSession', `Preparing ${model.name} model…`, model.name, 1);
  const common = { executionMode: 'sequential', graphOptimizationLevel: 'all' };
  if (preferWebGpu && configuration.preferWebGpu && 'gpu' in scope.navigator) {
    try {
      const session = await ort.InferenceSession.create(bytes, {
        ...common,
        executionProviders: ['webgpu', 'wasm'],
      });
      return { session, provider: 'webgpu' };
    } catch (error) {
      console.warn(`[OceanEyes AI] ${model.name} WebGPU failed; using WASM.`, error);
    }
  }
  return {
    session: await ort.InferenceSession.create(bytes, {
      ...common,
      executionProviders: ['wasm'],
    }),
    provider: 'wasm',
  };
}

function getSession(id, key, preferWebGpu) {
  let cachedSession;
  if (key === 'detector') cachedSession = detectorSession;
  else if (key === 'classifier') cachedSession = classifierSession;
  else cachedSession = claritySession;
  if (cachedSession) return cachedSession;

  const creation = createSession(id, key, preferWebGpu);
  const retrySafe = creation.catch((error) => {
    if (key === 'detector' && detectorSession === retrySafe) detectorSession = null;
    if (key === 'classifier' && classifierSession === retrySafe) classifierSession = null;
    if (key === 'clarity' && claritySession === retrySafe) claritySession = null;
    throw error;
  });
  if (key === 'detector') detectorSession = retrySafe;
  else if (key === 'classifier') classifierSession = retrySafe;
  else claritySession = retrySafe;
  return retrySafe;
}

function sourceCanvas(frame) {
  if (frame.pixels.length !== frame.width * frame.height * 4) {
    throw new Error('Camera frame RGBA buffer has an invalid length.');
  }
  const canvas = new OffscreenCanvas(frame.width, frame.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('OffscreenCanvas 2D is unavailable.');
  // package:image uses nearest-neighbour resizing by default on native. Keep
  // the browser preprocessing numerically aligned with that contract.
  context.imageSmoothingEnabled = false;
  context.putImageData(new ImageData(frame.pixels, frame.width, frame.height), 0, 0);
  return canvas;
}

function render(source, width, height, rectangle = null) {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('OffscreenCanvas 2D is unavailable.');
  if (rectangle) {
    context.drawImage(
      source,
      rectangle.x, rectangle.y, rectangle.width, rectangle.height,
      0, 0, width, height,
    );
  } else {
    context.drawImage(source, 0, 0, width, height);
  }
  return context.getImageData(0, 0, width, height);
}

function nchw(imageData, normalize) {
  const plane = imageData.width * imageData.height;
  const output = new Float32Array(plane * 3);
  for (let pixel = 0; pixel < plane; pixel += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = imageData.data[pixel * 4 + channel] / 255;
      output[channel * plane + pixel] = normalize
        ? (value - IMAGE_NET_MEAN[channel]) / IMAGE_NET_STD[channel]
        : value;
    }
  }
  return output;
}

function fullTensor(source, size, normalize) {
  return new ort.Tensor('float32', nchw(render(source, size, size), normalize), [1, 3, size, size]);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function classifierTensor(source, sourceWidth, sourceHeight, candidates, config) {
  const outputSize = config.classifierInputSize;
  const plane = outputSize * outputSize;
  const batch = new Float32Array(candidates.length * 3 * plane);
  for (let index = 0; index < candidates.length; index += 1) {
    const box = candidates[index].box;
    const x1 = clamp(Math.round(box.left * sourceWidth), 0, sourceWidth - 1);
    const y1 = clamp(Math.round(box.top * sourceHeight), 0, sourceHeight - 1);
    const x2 = clamp(Math.round(box.right * sourceWidth), 1, sourceWidth);
    const y2 = clamp(Math.round(box.bottom * sourceHeight), 1, sourceHeight);
    const cropWidth = Math.max(1, x2 - x1);
    const cropHeight = Math.max(1, y2 - y1);
    const scale = config.classifierResizeShortSide / Math.min(cropWidth, cropHeight);
    const resizedWidth = Math.max(outputSize, Math.round(cropWidth * scale));
    const resizedHeight = Math.max(outputSize, Math.round(cropHeight * scale));
    const resized = new OffscreenCanvas(resizedWidth, resizedHeight);
    const resizedContext = resized.getContext('2d');
    if (!resizedContext) throw new Error('Could not prepare fish crop.');
    resizedContext.imageSmoothingEnabled = false;
    resizedContext.drawImage(source, x1, y1, cropWidth, cropHeight, 0, 0, resizedWidth, resizedHeight);
    const offsetX = Math.round((resizedWidth - outputSize) / 2);
    const offsetY = Math.round((resizedHeight - outputSize) / 2);
    const normalized = nchw(render(resized, outputSize, outputSize, {
      x: offsetX, y: offsetY, width: outputSize, height: outputSize,
    }), true);
    batch.set(normalized, index * 3 * plane);
  }
  return new ort.Tensor('float32', batch, [candidates.length, 3, outputSize, outputSize]);
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function normalizedBox(cx, cy, width, height) {
  let left = clamp(cx - Math.abs(width) / 2, 0, 1);
  let top = clamp(cy - Math.abs(height) / 2, 0, 1);
  let right = clamp(cx + Math.abs(width) / 2, 0, 1);
  let bottom = clamp(cy + Math.abs(height) / 2, 0, 1);
  if (left > right) [left, right] = [right, left];
  if (top > bottom) [top, bottom] = [bottom, top];
  return { left, top, right, bottom };
}

function detectorCandidates(outputs, threshold) {
  const boxes = outputs.dets;
  const labels = outputs.labels;
  if (!boxes || !labels || boxes.dims[1] !== 300 || boxes.dims[2] !== 4 ||
      labels.dims[1] !== 300 || labels.dims[2] !== 2) {
    throw new Error('model-contract: detector outputs must be [1,300,4] and [1,300,2].');
  }
  const candidates = [];
  for (let query = 0; query < 300; query += 1) {
    const confidence = sigmoid(Math.max(labels.data[query * 2], labels.data[query * 2 + 1]));
    if (!Number.isFinite(confidence) || confidence < threshold) continue;
    const offset = query * 4;
    const box = normalizedBox(
      boxes.data[offset], boxes.data[offset + 1], boxes.data[offset + 2], boxes.data[offset + 3],
    );
    candidates.push({ box, confidence });
  }
  return candidates;
}

function softmaxPrediction(values, offset, length) {
  let maximum = Number.NEGATIVE_INFINITY;
  let maximumIndex = -1;
  for (let index = 0; index < length; index += 1) {
    const value = values[offset + index];
    if (Number.isFinite(value) && value > maximum) {
      maximum = value;
      maximumIndex = index;
    }
  }
  if (maximumIndex < 0) return { index: -1, probability: 0 };
  let denominator = 0;
  for (let index = 0; index < length; index += 1) denominator += Math.exp(values[offset + index] - maximum);
  return { index: maximumIndex, probability: 1 / denominator };
}

function turbidity(probabilities) {
  if (probabilities.length !== 11) throw new Error('model-contract: clarity output must have 11 values.');
  let fnu = -60.9;
  for (let index = 0; index < 11; index += 1) fnu += TURBIDITY_COEFFICIENTS[index] * probabilities[index];
  const normalized = clamp((fnu - 0.44) / (53.42 - 0.44), 0, 1);
  return { fnu, clarityScore: Math.round((10 - normalized * 9) * 10) / 10 };
}

async function analyze(request) {
  const started = performance.now();
  const id = request.id;
  assertNotCancelled(id);
  progress(id, 'running', 'Preparing camera frames for AI…');
  const detectionSource = sourceCanvas(request.detection);
  const fullSource = sourceCanvas(request.full);

  const detector = await getSession(id, 'detector', false);
  assertNotCancelled(id);
  const clarity = await getSession(id, 'clarity', false);
  assertNotCancelled(id);
  progress(id, 'running', 'Detecting fish and measuring water clarity…');
  const [detectorOutputs, clarityOutputs] = await Promise.all([
    detector.session.run({ input: fullTensor(detectionSource, request.configuration.detectorInputSize, true) }),
    clarity.session.run({ images: fullTensor(fullSource, request.configuration.waterClarityInputSize, false) }),
  ]);
  const candidates = detectorCandidates(detectorOutputs, request.thresholds.detectionConfidence);
  const clarityOutput = clarityOutputs.output0;
  if (!clarityOutput) throw new Error('model-contract: clarity output "output0" is missing.');
  const water = turbidity(clarityOutput.data);
  const detections = candidates.map((candidate) => ({
    box: {
      left: request.region.left + candidate.box.left * request.region.width,
      top: request.region.top + candidate.box.top * request.region.height,
      right: request.region.left + candidate.box.right * request.region.width,
      bottom: request.region.top + candidate.box.bottom * request.region.height,
    },
    detectionConfidence: candidate.confidence,
    speciesId: null,
    classificationConfidence: null,
  }));
  const speciesCounts = {};
  const classificationCandidates = candidates.slice(0, request.configuration.maximumClassificationsPerFrame);
  let classifierProvider = null;
  if (classificationCandidates.length > 0) {
    assertNotCancelled(id);
    const classifier = await getSession(id, 'classifier', true);
    classifierProvider = classifier.provider;
    progress(id, 'running', 'Classifying detected fish…');
    const output = await classifier.session.run({
      input: classifierTensor(
        detectionSource,
        request.detection.width,
        request.detection.height,
        classificationCandidates,
        request.configuration,
      ),
    });
    if (!output.output || output.output.dims[0] !== classificationCandidates.length || output.output.dims[1] !== 24) {
      throw new Error('model-contract: classifier output must be [fish,24].');
    }
    for (let index = 0; index < classificationCandidates.length; index += 1) {
      const prediction = softmaxPrediction(output.output.data, index * 24, 24);
      if (prediction.probability < request.thresholds.classificationConfidence || prediction.index < 0) continue;
      const speciesId = SPECIES[prediction.index];
      detections[index].speciesId = speciesId;
      detections[index].classificationConfidence = prediction.probability;
      speciesCounts[speciesId] = (speciesCounts[speciesId] || 0) + 1;
    }
  }
  assertNotCancelled(id);
  const elapsedMilliseconds = performance.now() - started;
  progress(id, 'ready', `Browser inference completed in ${Math.round(elapsedMilliseconds)} ms.`);
  return {
    fishCount: candidates.length,
    meanDetectionConfidence: candidates.length
      ? candidates.reduce((sum, item) => sum + item.confidence, 0) / candidates.length
      : 0,
    speciesCounts,
    turbidityFnu: water.fnu,
    clarityScore: water.clarityScore,
    detections,
    elapsedMilliseconds,
    providers: { detector: detector.provider, classifier: classifierProvider, clarity: clarity.provider },
    contractVersion: 1,
  };
}

async function process(request) {
  try {
    if (request.type === 'initialize') {
      configuration = request.configuration;
      progress(request.id, 'checkingCapabilities', 'Browser AI capabilities are available.');
      scope.postMessage({
        id: request.id,
        ok: true,
        result: { contractVersion: 1, lazyModelLoading: true },
      });
      return;
    }
    if (request.type !== 'analyze') return;
    configuration = request.configuration;
    const result = await analyze(request);
    scope.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    const cancelledRequest = error?.name === 'AbortError';
    progress(
      request.id,
      cancelledRequest ? 'cancelled' : 'failed',
      cancelledRequest ? 'Browser inference cancelled.' : 'Browser inference failed.',
    );
    scope.postMessage({
      id: request.id,
      ok: false,
      error: cancelledRequest ? 'Browser inference was cancelled.' : String(error?.message || error),
    });
  } finally {
    cancelled.delete(request.id);
  }
}

scope.addEventListener('message', (event) => {
  const request = event.data;
  if (request.type === 'cancel') {
    cancelled.add(request.id);
    return;
  }
  queue = queue.then(() => process(request));
});
