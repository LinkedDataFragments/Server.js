// qejs reads require.main.filename, which Vitest never sets.
if (!process.mainModule)
  process.mainModule = { filename: process.cwd() };
