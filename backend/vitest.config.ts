import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/support/global-setup.ts'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/**/*.cli.ts'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 75, functions: 75, branches: 75, statements: 75 },
    },
  },
});
