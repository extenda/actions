import { defineConfig } from 'vitest/config';
import {  resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // 🚨 Force 'fast-glob' to point to our generic mock that supports mock-fs
      'fast-glob': resolve(__dirname, '.test/mocks/fast-glob.js'),
    },
  },
  test: {
    // --- Architecture & Setup ---
    include: ['**/test/**/*.test.js'],
    setupFiles: ['./vitest.setup.js'],
    pool: 'threads', // or 'forks' if mock-fs acts up, but we solved that!

    // --- Coverage (Matches Jest) ---
    coverage: {
      provider: 'v8', // Recommended over istanbul
      enabled: true,
      reporter: ['lcov', 'text'], // Matches your coverageReporters
      reportsDirectory: 'coverage',
      exclude: ['**/node_modules/**', '**/*.json'],
    },

    // --- Reporters (Matches Jest + Sonar) ---
    reporters: [
      'default', // Console output
      [
        'vitest-sonar-reporter',
        { outputFile: 'test-results/sonar-report.xml' },
      ],
    ],

    // --- Performance ---
    // Jest's 'maxWorkers: 50%' is roughly handled by poolOptions in Vitest,
    // but usually, Vitest defaults are smarter. Start with defaults.
  },
});
