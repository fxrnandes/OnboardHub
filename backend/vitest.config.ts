import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // o server.ts só chama o listen; o que importa testar está no app.ts
      exclude: ['src/server.ts'],
      reporter: ['text', 'lcov'],
      // meta mínima do Playbook para o backend (Web Apps): 75%
      thresholds: { lines: 75, functions: 75, branches: 75, statements: 75 },
    },
  },
});
