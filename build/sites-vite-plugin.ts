import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { access, cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const MODEL_FILES = [
  'fish_detection.onnx',
  'species_classifier.onnx',
  'turbidity.onnx',
] as const;

interface ModelManifest {
  models: Record<string, { bytes: number; sha256: string }>;
}

function sha256(path: string): Promise<string> {
  return new Promise((resolveHash, rejectHash) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', rejectHash)
      .on('end', () => resolveHash(hash.digest('hex')));
  });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: 'sites',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = resolve(root, 'dist', '.openai');
      const hostingConfig = resolve(root, '.openai', 'hosting.json');

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });
      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(outputDirectory, 'hosting.json'));
      }
    },
  };
}

export function onDeviceModels(): Plugin {
  let root = process.cwd();

  return {
    name: 'on-device-models',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url ? new URL(request.url, 'http://localhost').pathname : '';
        const filename = pathname.startsWith('/models/') ? pathname.slice('/models/'.length) : '';
        if (!MODEL_FILES.includes(filename as (typeof MODEL_FILES)[number])) {
          next();
          return;
        }

        const source = resolve(root, 'ai', 'models', 'web', filename);
        try {
          const modelStat = await stat(source);
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/octet-stream');
          response.setHeader('Content-Length', String(modelStat.size));
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          createReadStream(source).pipe(response);
        } catch {
          response.statusCode = 404;
          response.end('Model file not found');
        }
      });
    },
    async closeBundle() {
      const modelDirectory = resolve(root, 'ai', 'models');
      const sourceDirectory = resolve(modelDirectory, 'web');
      const manifest = JSON.parse(
        await readFile(resolve(modelDirectory, 'model-manifest.json'), 'utf8')
      ) as ModelManifest;
      const staleRootOutput = resolve(root, 'dist', 'models');
      const outputDirectories = [resolve(root, 'dist', 'client', 'models')];

      await Promise.all(
        MODEL_FILES.map(async (filename) => {
          const path = resolve(sourceDirectory, filename);
          const [modelStat, digest] = await Promise.all([stat(path), sha256(path)]);
          const expected = manifest.models[filename];
          if (!expected || modelStat.size !== expected.bytes || digest !== expected.sha256) {
            throw new Error(`AI model ${filename} does not match ai/models/model-manifest.json`);
          }
        })
      );

      await rm(staleRootOutput, { recursive: true, force: true });
      await Promise.all(
        outputDirectories.map(async (outputDirectory) => {
          await rm(outputDirectory, { recursive: true, force: true });
          await mkdir(outputDirectory, { recursive: true });
          await Promise.all(
            MODEL_FILES.map((filename) => cp(resolve(sourceDirectory, filename), resolve(outputDirectory, filename)))
          );
        })
      );
    },
  };
}
