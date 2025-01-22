import { defineConfig, mergeConfig } from 'vitest/config';

const baseConfig = defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/*.{ts,tsx}'],
    },
    environment: 'happy-dom',
  },
});

const prodConfig = mergeConfig(baseConfig, {
  test: {
    include: ['src/test/production/*.test.{ts,tsx}'],
    env: {
      NODE_ENV: 'production',
    },
  },
});

const devConfig = mergeConfig(baseConfig, {
  test: {
    include: ['src/test/**/!(production)/*.test.{ts,tsx}'],
    env: {
      NODE_ENV: 'development',
    },
  },
});

export default process.env.TEST_ENV === 'production' ? prodConfig : devConfig;
