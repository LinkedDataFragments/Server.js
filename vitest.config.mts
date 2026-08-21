import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    // Prefer .ts so a require()/import never mixes compiled .js and its own
    // .ts source into two module instances of the same class (breaks instanceof).
    extensions: ['.ts', '.mjs', '.js', '.mts', '.jsx', '.tsx', '.json'],
    alias: [
      // Bare `@ldf/x` resolves via package.json's "main" instead, a step the
      // extensions list above doesn't cover. Force it onto .ts too, same reason.
      { find: /^@ldf\/([^/]+)$/, replacement: `${rootDir}packages/$1/index.ts` },
    ],
  },
  test: {
    include: ['packages/*/test/**/*-test.js'],
    environment: 'node',
    testTimeout: 5000,
    setupFiles: ['./test/vitest-setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/*/lib/**'],
      exclude: ['**/*.html', '**/*.js.map'],
    },
  },
});
