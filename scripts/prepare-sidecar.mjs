import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const targetTriple = execSync('rustc -vV', { encoding: 'utf8' })
  .split('\n')
  .find((line) => line.startsWith('host:'))
  ?.replace('host:', '')
  .trim();

if (!targetTriple) {
  throw new Error('无法识别 Rust host target triple');
}

const extension = process.platform === 'win32' ? '.exe' : '';
const sourceNode = process.execPath;
const targetPath = join(
  process.cwd(),
  'src-tauri',
  'binaries',
  `node-${targetTriple}${extension}`
);

if (!existsSync(dirname(targetPath))) {
  mkdirSync(dirname(targetPath), { recursive: true });
}

copyFileSync(sourceNode, targetPath);
