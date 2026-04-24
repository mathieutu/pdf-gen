import antfu from '@antfu/eslint-config'
import tailwind from 'eslint-plugin-better-tailwindcss'

export default antfu({
  formatters: true,
  react: true,
  nextjs: true,
  ignores: [
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ],
}, {
  ...tailwind.configs.recommended,
  settings: {
    [tailwind.meta.name]: {
      entryPoint: 'src/app/globals.css',
    },
  },
}, {
  rules: {
    'antfu/top-level-function': 'off',
    'antfu/if-newline': 'off',
    'ts/consistent-type-definitions': ['error', 'type'],
    'style/max-len': ['warn', { code: 120, ignoreComments: true, ignoreTemplateLiterals: true, ignoreStrings: true }],
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'], // @see https://github.com/9romise/eslint-plugin-import-lite/issues/22
    'style/operator-linebreak': ['error', 'before', { overrides: { '=': 'after' } }],
    'style/no-extra-parens': 'off',
    'style/brace-style': ['error', '1tbs'],
    'style/multiline-ternary': 'off',
    'style/arrow-parens': ['error', 'as-needed'],
    'node/prefer-global/process': 'off',
    'style/type-generic-spacing': 'off', // Does not allow comment in generics.
    'style/member-delimiter-style': ['error', {
      multiline: { delimiter: 'comma', requireLast: true },
      singleline: { delimiter: 'comma', requireLast: false },
      multilineDetection: 'brackets',
    }],
  },
}, {
  files: ['**/*.ts', '**/*.tsx'],
  rules: {
    'ts/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
  },
}, {
  files: ['**/*.md'],
  rules: {
    'style/max-len': 'off',

  },
})
