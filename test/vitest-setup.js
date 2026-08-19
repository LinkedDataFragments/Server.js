// qejs's file resolver reads `require.main.filename` when resolving a
// template referenced via `inherits(...)` (see node_modules/qejs/lib/filesystem.js).
// Vitest's workers have no classic CommonJS entry script, so `process.mainModule`
// (and therefore `require.main`) is never set, and that access throws — which,
// deep inside an un-terminated Q promise chain, gets silently swallowed instead
// of surfacing, leaving the response (and the test) hanging forever.
if (!process.mainModule)
  process.mainModule = { filename: process.cwd() };
