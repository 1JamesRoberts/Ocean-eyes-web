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
          '^fs-reset$',
          '^camera-scanline$',
          '^qr-code-canvas$',
          '^camera-flash-overlay$',
          '^flash-active$',
          '^modal-overlay$',
          '^modal-content$',
          '^glass-card$',
          '^glass-header$',
          '^glass-sidebar$',
          '^glass-panel$',
          '^glass-input$',
          '^glass-button$',
          '^glass-button-primary$',
          '^glass-button-outline$',
          '^glass-icon-button$',
          '^glass-pill$',
          '^liquid-bg$',
          '^shimmer$',
          '^progress-ring$',
          '^progress-ring-circle$',
          '^material-symbols-outlined$',
          '^phone-content$',
          '^bg-gradient-mint$',
          '^phone-frame-root$',
          '^phone-frame$',
          '^pill-nav$',
          '^pill-nav-item$',
          '^pill-nav-active$',
          '^pill-nav-icon$',
          '^pill-nav-badge$',
          '^pill-nav-label$',
          '^status-bar$',
          '^status-bar-notch$',
          '^status-bar-left$',
          '^status-bar-time$',
          '^status-bar-right$',
          '^status-bar-icon$',
          '^status-bar-battery$',
          '^status-bar-battery-icon$',
          '^status-bar-battery-fill$',
        ],
      },
    },
  },
])
