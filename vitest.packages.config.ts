import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['packages/**/__tests__/*.test.ts'],
  },
  resolve: {
    alias: {
      '@data-engine/schema': path.resolve(__dirname, 'packages/schema/src/index.ts'),
      '@data-engine/adapter': path.resolve(__dirname, 'packages/adapter/src/index.ts'),
      '@data-engine/adapter-knex': path.resolve(__dirname, 'packages/adapter-knex/src/index.ts'),
      '@data-engine/engine': path.resolve(__dirname, 'packages/engine/src/index.ts'),
      '@data-engine/migration': path.resolve(__dirname, 'packages/migration/src/index.ts'),
    },
  },
});
