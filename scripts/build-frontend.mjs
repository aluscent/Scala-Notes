import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const args of [['ci'], ['run', 'build']]) {
  const result = spawnSync('npm', args, { cwd: root + 'frontend', stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
mkdirSync(root + 'backend/public', { recursive: true });
rmSync(root + 'backend/public/assets', { recursive: true, force: true });
cpSync(root + 'frontend/dist/', root + 'backend/public/', { recursive: true });
