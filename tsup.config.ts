import { defineConfig, type Options } from 'tsup';

const banner = `/**
 * @license bippy
 *
 * Copyright (c) Aiden Bai.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */`;

const DEFAULT_OPTIONS: Options = {
  entry: [],
  banner: {
    js: banner,
  },
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
  {
    ...DEFAULT_OPTIONS,
    format: ['esm', 'cjs'],
    entry: ['./src/index.ts'],
  },
  {
    ...DEFAULT_OPTIONS,
    format: ['iife'],
    minify: true,
    entry: ['./src/index.ts'],
  },
]);
