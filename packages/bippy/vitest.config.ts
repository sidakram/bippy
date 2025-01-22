import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/*.ts'],
      // excluded until i can find a way to run these tests in production mode
      exclude: ['src/test/production/**'],
    },
  },
});
