/// <reference types="node" />

import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcRoot = fileURLToPath(new URL('..', import.meta.url));
const paletteDocument = fileURLToPath(new URL('../../docs/color-palette.html', import.meta.url));
const indexCss = join(srcRoot, 'index.css');

const approvedPrimitives = new Map([
  ['neon-ice', '#00ffe5'],
  ['turquoise', '#00c8b3'],
  ['dark-cyan', '#00645a'],
  ['verdigris', '#32a198'],
  ['tropical-teal', '#79beb7'],
  ['pearl-aqua', '#9bcbc7'],
  ['azure-mist', '#f4fffe'],
  ['white', '#ffffff'],
  ['slate-grey', '#828e97'],
  ['prussian-blue', '#051e32'],
]);

const retiredNames = [
  ['pine', 'teal'],
  ['turquoise', 'surf'],
  ['sky', 'surge'],
  ['azure', 'mist', '2'],
].map((parts) => parts.join('-'));

const literalExceptionFiles = new Set([
  'components/SpeciesSelector.tsx',
  'components/analytics/analyticsTooltipMaterial.ts',
  'components/fish/DetectionVisibilityRing.tsx',
  'components/live/AIAnalysisPanel.tsx',
  'components/live/AIBoundingBoxes.tsx',
  'hooks/live/useAmbientCanvasDebug.ts',
  'models/services/cameraFilterModel.ts',
  'pages/LoginScreen.tsx',
]);

const collectSourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectSourceFiles(path);
    }
    return ['.css', '.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });

describe('OceanEyes color palette', () => {
  it('defines the approved primitive colors exactly once', () => {
    const css = readFileSync(indexCss, 'utf8').toLowerCase();

    for (const [name, value] of approvedPrimitives) {
      expect(css.match(new RegExp(`--color-${name}:\\s*${value}`, 'g'))).toHaveLength(1);
    }
  });

  it('contains no retired palette names in application source or documentation', () => {
    const files = [...collectSourceFiles(srcRoot), paletteDocument];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const retiredName of retiredNames) {
        expect(source, `${retiredName} remains in ${file}`).not.toContain(retiredName);
      }
    }
  });

  it('maps Dark Cyan to active navigation icons only', () => {
    const css = readFileSync(indexCss, 'utf8');

    expect(css).toContain('--role-navigation-active-icon: var(--color-dark-cyan);');
    expect(css).toMatch(
      /\.pill-nav-active \.pill-nav-icon\s*{\s*color: var\(--role-navigation-active-icon\);\s*}/,
    );
    expect(css).toMatch(
      /\.pill-nav-active\s*{\s*color: var\(--role-text-primary\);\s*}/,
    );
  });

  it('keeps authored color literals in the token source or documented exception paths', () => {
    const literalPattern = /#[\da-f]{3,8}|rgba?\([^)]*\)/gi;
    const unexpectedFiles = collectSourceFiles(srcRoot)
      .filter((file) => file !== indexCss)
      .filter((file) => !file.endsWith('data\\speciesCatalog.ts') && !file.endsWith('data/speciesCatalog.ts'))
      .filter((file) => !literalExceptionFiles.has(relative(srcRoot, file).replaceAll('\\', '/')))
      .filter((file) => readFileSync(file, 'utf8').match(literalPattern) !== null);

    expect(unexpectedFiles).toEqual([]);
  });
});
