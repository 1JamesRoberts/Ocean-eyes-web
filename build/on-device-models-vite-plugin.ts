import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { access, appendFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
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

interface ModelSource {
  bytes: number;
  digest: string;
  paths: string[];
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

async function inspectModel(sourceDirectory: string, filename: string): Promise<ModelSource> {
  const path = resolve(sourceDirectory, filename);
  if (await exists(path)) {
    const [modelStat, digest] = await Promise.all([stat(path), sha256(path)]);
    return { bytes: modelStat.size, digest, paths: [path] };
  }

  const partPrefix = `${filename}.part-`;
  const parts = (await readdir(sourceDirectory))
    .filter((entry) => entry.startsWith(partPrefix))
    .sort()
    .map((entry) => resolve(sourceDirectory, entry));
  if (parts.length === 0) {
    throw new Error(`AI model ${filename} and its deployment chunks are missing`);
  }

  const hash = createHash('sha256');
  let bytes = 0;
  for (const part of parts) {
    const contents = await readFile(part);
    bytes += contents.byteLength;
    hash.update(contents);
  }
  return { bytes, digest: hash.digest('hex'), paths: parts };
}

async function copyModel(source: ModelSource, destination: string): Promise<void> {
  if (source.paths.length === 1 && !source.paths[0].includes('.part-')) {
    await cp(source.paths[0], destination);
    return;
  }

  await writeFile(destination, new Uint8Array());
  for (const part of source.paths) {
    await appendFile(destination, await readFile(part));
  }
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
      const outputDirectory = resolve(root, 'dist', 'models');

      const modelSources = await Promise.all(
        MODEL_FILES.map(async (filename) => {
          const source = await inspectModel(sourceDirectory, filename);
          const expected = manifest.models[filename];
          if (!expected || source.bytes !== expected.bytes || source.digest !== expected.sha256) {
            throw new Error(`AI model ${filename} does not match ai/models/model-manifest.json`);
          }
          return [filename, source] as const;
        })
      );

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });
      await Promise.all(
        modelSources.map(([filename, source]) => copyModel(source, resolve(outputDirectory, filename)))
      );
    },
  };
}
