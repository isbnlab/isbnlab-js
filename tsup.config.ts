import { defineConfig } from 'tsup';

// One bundle per module format, so Node's ESM loader never sees the generated
// code's extensionless imports.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  target: 'es2020',
  platform: 'neutral',
  sourcemap: true,
  clean: true,
});
