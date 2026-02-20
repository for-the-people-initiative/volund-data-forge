import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    tsconfig: 'tsconfig.json',
    compilerOptions: { composite: false },
  },
  clean: true,
  outDir: 'dist',
})
