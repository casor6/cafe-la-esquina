import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

const env = config({ path: '.env.test', quiet: true }).parsed ?? {};

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    env: { ...env, ENV_FILE: '.env.test' },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
