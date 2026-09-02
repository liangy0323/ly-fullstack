import { spawn } from 'node:child_process';

import { getE2eEnvironment } from './environment';

/**
 * 在仓库根目录执行 pnpm 子命令
 *
 * @param args pnpm 参数
 * @param env 已完成测试数据库安全校验的进程环境
 */
const runPnpm = async (args: string[], env: NodeJS.ProcessEnv): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', args, {
      cwd: process.cwd(),
      env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`pnpm ${args.join(' ')} 执行失败（code=${String(code)}, signal=${String(signal)}）。`));
    });
  });
};

/**
 * 准备独立 E2E 数据库并执行真实 migration 与 seed
 *
 * `getE2eEnvironment` 会先拒绝远程地址、开发库名称和生产环境。测试不执行 destructive reset：
 * migration 与 seed 保持幂等，业务用例使用唯一数据并在 finally 中严格清理，失败重跑不会产生命名冲突。
 */
export const prepareE2eDatabase = async (): Promise<void> => {
  const environment = getE2eEnvironment();
  const commandEnvironment = {
    ...process.env,
    APP_ENV: 'test',
    DATABASE_URL: environment.databaseUrl,
    ADMIN_INITIAL_PASSWORD: environment.adminPassword,
  };

  const startedAt = Date.now();
  console.log('正在准备独立 E2E 数据库并执行 migration/seed…');
  await runPnpm(['--filter', '@repo/database', 'db:migrate'], commandEnvironment);
  await runPnpm(['--filter', '@repo/database', 'generate'], commandEnvironment);
  await runPnpm(['--filter', '@repo/database', 'db:seed'], commandEnvironment);
  console.log(`E2E 数据库准备完成，耗时 ${((Date.now() - startedAt) / 1_000).toFixed(1)}s。`);
};
