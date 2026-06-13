import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      betterTailwindcss.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/index.css',
        detectComponentClasses: true,
        lineBreakStyle: 'windows',
        ignore: [
          '^live-camera-feed$',
          '^camera-scanline$',
          '^qr-code-canvas$',
          '^camera-flash-overlay$',
          '^flash-active$',
          '^modal-overlay$',
          '^modal-content$',
        ],
      },
    },
  },
])
