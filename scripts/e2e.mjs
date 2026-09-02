import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const environmentFile = resolve(repositoryRoot, process.env.E2E_ENV_FILE || '.env.e2e');

if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile);
}

/**
 * 本地代理不能拦截 Playwright 管理的回环服务，否则 webServer 健康检查会收到代理返回的 502。
 */
process.env.NO_PROXY = '127.0.0.1,localhost,::1';
process.env.no_proxy = process.env.NO_PROXY;

const startedAt = Date.now();
const child = spawn('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], {
  cwd: repositoryRoot,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Playwright 启动失败：${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  const elapsedSeconds = ((Date.now() - startedAt) / 1_000).toFixed(1);
  console.log(`Playwright 端到端任务结束，总耗时 ${elapsedSeconds}s。`);

  if (signal) {
    console.error(`Playwright 进程被信号 ${signal} 中止。`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
