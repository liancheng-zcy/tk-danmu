import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const entryPoint = resolve('worker/src/index.ts');
const outfile = resolve('worker/bundle/index.cjs');

await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info'
});
