import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['./src/index.ts'],
    outDir: './dist',
    splitting: false,
    sourcemap: false,
    format: ['cjs', 'esm', 'iife'],
    target: 'esnext',
    platform: 'browser',
    treeshake: true,
    dts: true,
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    env: {
      NODE_ENV: process.env.NODE_ENV ?? 'development',
    },
    globalName: 'Bippy',
    external: ['react', 'react-dom', 'react-reconciler'],
  },
]);
