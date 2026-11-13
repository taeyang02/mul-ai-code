import js from '@eslint/js'

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'a11y-artifacts/**',
      'e2e-artifacts/**',
    ],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...js.configs.recommended,
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
    },
  },
]
