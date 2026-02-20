import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import prettierConfig from 'eslint-config-prettier'

const sharedRules = {
  ...tseslint.configs.recommended.rules,
  ...prettierConfig.rules,
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
  ],
}

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.nuxt/**', '**/*.d.ts', '**/*.js', '**/*.map'],
  },
  {
    files: ['packages/*/src/**/*.ts', 'packages/ui/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: sharedRules,
  },
  {
    files: ['packages/ui/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsparser, ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { vue: vuePlugin, '@typescript-eslint': tseslint },
    rules: sharedRules,
  },
]
