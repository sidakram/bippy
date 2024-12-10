import { defineConfig, type Options } from 'tsup';

const DEFAULT_OPTIONS: Options = {
  entry: ['./src/index.ts'],
  outDir: './dist',
  splitting: false,
  sourcemap: false,
  format: [],
  target: 'esnext',
  platform: 'browser',
  treeshake: true,
  dts: true,
  minify: false,
  env: {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  },
  globalName: 'Bippy',
  external: ['react', 'react-dom', 'react-reconciler'],
};

export default defineConfig([
  { ...DEFAULT_OPTIONS, format: ['esm', 'cjs'] },
  { ...DEFAULT_OPTIONS, format: ['iife'], minify: true },
]);
