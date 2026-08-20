import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    // Compiled lib/*.js sits alongside its lib/*.ts source (gitignored build
    // output, needed for other packages' plain-require entry points). Vite's
    // default extension order prefers .js, so a require()/import resolved
    // through Vite's own module graph and the SAME module's own internal
    // relative imports (resolved through the compiled .js's require()) can
    // silently load two different module instances of the same file —
    // breaking instanceof/identity checks. Preferring .ts first keeps every
    // resolution consistently on source.
    extensions: ['.ts', '.mjs', '.js', '.mts', '.jsx', '.tsx', '.json'],
    alias: [
      // A bare `@ldf/x` (package root, no subpath) resolves via package.json's
      // "main": "index.js" — a Node resolution step the extensions list above
      // doesn't cover, since it's a different mechanism than extension probing.
      // That pulls in the compiled index.js's whole require() chain (all
      // compiled .js), while a deep import like `@ldf/x/lib/Foo` resolves
      // straight to Foo.ts. Same class, two module instances, broken
      // instanceof. Force package roots onto their .ts entry point too.
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
