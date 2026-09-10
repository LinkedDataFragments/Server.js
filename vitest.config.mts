import { existsSync } from 'fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Resolves this monorepo's compiled JavaScript back to the TypeScript it was built from.
 *
 * Packages refer to each other as `@ldf/x`, which resolves through package.json's "main" to
 * `index.js`. Without this, tests would run against the last build instead of the working tree,
 * and a class reached through both routes would end up with two identities, breaking `instanceof`.
 * @returns A Vite plugin redirecting built files to their sources.
 */
function preferTypeScriptSources(): Plugin {
  return {
    name: 'ldf:prefer-typescript-sources',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && !resolved.external && resolved.id.endsWith('.js') && !resolved.id.includes('node_modules')) {
        const typescriptSource = `${resolved.id.slice(0, -'.js'.length)}.ts`;
        if (existsSync(typescriptSource))
          return { ...resolved, id: typescriptSource };
      }
      return resolved;
    },
  };
}

export default defineConfig({
  plugins: [preferTypeScriptSources()],
  resolve: {
    // Prefer .ts so a require()/import never mixes compiled .js and its own
    // .ts source into two module instances of the same class (breaks instanceof).
    extensions: ['.ts', '.mjs', '.js', '.mts', '.jsx', '.tsx', '.json'],
  },
  test: {
    include: ['packages/*/test/**/*-test.ts'],
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
