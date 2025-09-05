import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  outDir: 'lib',
  minify: true,
  platform: 'node',
  target: 'node12',
  dts: false,
  sourcemap: false,
  format: ['cjs']
});
