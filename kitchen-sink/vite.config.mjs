import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    minify: false,
  },
  plugins: [
    react({
      // babel: {
      //   plugins: [['babel-plugin-react-compiler', {}]],
      // },
    }),
  ],
  resolve:
    process.env.NODE_ENV === 'production'
      ? {}
      : {
          alias: {
            bippy: path.resolve(__dirname, '..'),
          },
        },
});
