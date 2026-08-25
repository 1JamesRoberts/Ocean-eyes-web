(function () {
  'use strict';

  let worker = null;
  let nextRequestId = 1;
  const pending = new Map();

  function capabilities() {
    return {
      webWorker: typeof Worker !== 'undefined',
      webAssembly: typeof WebAssembly !== 'undefined',
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      webGpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
    };
  }

  function rejectPending(error) {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  }

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker('oceaneyes_inference_worker.js', { type: 'module' });
    worker.addEventListener('message', (event) => {
      const message = event.data;
      const request = pending.get(message.id);
      if (!request) return;
      if (message.type === 'progress') {
        request.onProgress?.(JSON.stringify(message.progress));
        return;
      }
      pending.delete(message.id);
      if (message.ok) request.resolve(JSON.stringify(message.result));
      else request.reject(new Error(message.error || 'Browser inference failed.'));
    });
    worker.addEventListener('error', (event) => {
      rejectPending(new Error(event.message || 'The browser AI worker stopped unexpectedly.'));
      worker?.terminate();
      worker = null;
    });
    return worker;
  }

  function request(message, transfer, onProgress) {
    return new Promise((resolve, reject) => {
      pending.set(message.id, { resolve, reject, onProgress });
      try {
        ensureWorker().postMessage(message, transfer);
      } catch (error) {
        pending.delete(message.id);
        reject(error);
      }
    });
  }

  window.oceanEyesInference = {
    capabilitiesJson() {
      return JSON.stringify(capabilities());
    },

    initialize(configurationJson, onProgress) {
      const id = nextRequestId++;
      return request(
        { id, type: 'initialize', configuration: JSON.parse(configurationJson) },
        [],
        onProgress,
      );
    },

    analyze(
      configurationJson,
      detectionPixels,
      detectionWidth,
      detectionHeight,
      fullPixels,
      fullWidth,
      fullHeight,
      regionJson,
      thresholdsJson,
      onProgress,
    ) {
      const id = nextRequestId++;
      // Clone before transfer so the Dart/image package remains owner of its
      // buffers after postMessage detaches these worker-bound copies.
      const detection = new Uint8ClampedArray(detectionPixels);
      const full = new Uint8ClampedArray(fullPixels);
      const promise = request(
        {
          id,
          type: 'analyze',
          configuration: JSON.parse(configurationJson),
          detection: { pixels: detection, width: detectionWidth, height: detectionHeight },
          full: { pixels: full, width: fullWidth, height: fullHeight },
          region: JSON.parse(regionJson),
          thresholds: JSON.parse(thresholdsJson),
        },
        [detection.buffer, full.buffer],
        onProgress,
      );
      promise.requestId = id;
      return promise;
    },

    cancel(requestId) {
      const request = pending.get(requestId);
      if (request) {
        pending.delete(requestId);
        request.reject(new DOMException('Browser inference was cancelled.', 'AbortError'));
      }
      // ONNX Runtime does not expose a portable per-run abort primitive. A
      // worker termination is the only immediate cancellation that also stops
      // CPU/GPU work and releases its model sessions.
      worker?.terminate();
      worker = null;
    },

    lastRequestId() {
      return nextRequestId - 1;
    },

    dispose() {
      rejectPending(new DOMException('Browser inference was disposed.', 'AbortError'));
      worker?.terminate();
      worker = null;
    },
  };
})();
