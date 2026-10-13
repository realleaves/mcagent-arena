import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const children = [
  spawn('pnpm', ['exec', 'tsx', 'watch', 'apps/api/src/server.ts'], { stdio: 'inherit' }),
  spawn('pnpm', ['exec', 'vite', '--config', 'apps/web/vite.config.ts'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill('SIGTERM'));
  process.exitCode = code;
}
children.forEach((c) => {
  c.on('error', (e) => {
    console.error(e.message);
    stop(1);
  });
  c.on('exit', (code) => stop(code || 0));
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
