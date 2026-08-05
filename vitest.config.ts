import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const configDir = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      // Force 'fast-glob' to point to our generic mock that supports mock-fs
      'fast-glob': resolve(configDir, '.test/mocks/fast-glob.js'),
    },
  },
  test: {
    // --- Architecture & Setup ---
    include: ['**/test/**/*.test.js'],
    setupFiles: ['./vitest.setup.js'],
    pool: 'threads',

    // --- Coverage  ---
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['lcov', 'text'],
      reportsDirectory: 'coverage',
      exclude: ['**/node_modules/**', '**/*.json'],
    },

    // --- Reporters ---
    reporters: [
      'default', // Console output
      [
        'vitest-sonar-reporter',
        { outputFile: 'test-results/sonar-report.xml' },
      ],
    ],
  },
});
