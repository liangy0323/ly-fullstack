import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

import { getE2eEnvironment } from './tests/e2e/helpers/environment';

/**
 * 直接运行 Playwright 或使用编辑器插件时不会经过 scripts/e2e.mjs，因此配置文件也必须主动加载
 * 私有 E2E 环境。进程中已显式注入的变量仍保持最高优先级，便于 CI Secret 覆盖本地配置。
 */
const environmentFile = resolve(import.meta.dirname, process.env.E2E_ENV_FILE || '.env.e2e');
if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile);
}

const environment = getE2eEnvironment();
const isCi = Boolean(process.env.CI);

/**
 * LY Fullstack 端到端测试配置
 *
 * 三个应用全部使用独立测试端口，且禁止复用已存在的进程，避免误连开发服务。数据库准备和管理员
 * 认证状态由 global setup 完成；共享数据库状态下固定单 worker，后续只有完成账号与数据分片后才能并行。
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  outputDir: './test-results',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: 1,
  reporter: [
    [isCi ? 'line' : 'list'],
    ['html', { outputFolder: 'playwright-report', open: 'never', title: 'LY Fullstack E2E' }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: environment.adminUrl,
    storageState: environment.authStatePath,
    screenshot: 'only-on-failure',
    trace: isCi ? 'on-first-retry' : 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: [
    {
      name: 'Admin API',
      command: 'pnpm --filter @repo/admin-api exec tsx src/main.ts',
      url: `${environment.adminApiUrl}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        APP_ENV: 'test',
        PORT: String(environment.adminApiPort),
        DATABASE_URL: environment.databaseUrl,
        CORS_ORIGINS: environment.adminUrl,
        JWT_SECRET: environment.jwtSecret,
        JWT_EXPIRES_IN: '1h',
      },
    },
    {
      name: 'API',
      command: 'pnpm --filter @repo/api exec tsx src/main.ts',
      url: `${environment.apiUrl}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        APP_ENV: 'test',
        PORT: String(environment.apiPort),
        DATABASE_URL: environment.databaseUrl,
        CORS_ORIGINS: environment.adminUrl,
      },
    },
    {
      name: 'Admin',
      command:
        'pnpm --filter @repo/admin exec rsbuild dev --host 127.0.0.1 --env-mode test --config build/rsbuild.dev.config.ts',
      url: environment.adminUrl,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        APP_ENV: 'test',
        API_BASE_URL: environment.adminApiUrl,
        PORT: String(environment.adminPort),
        PLAYWRIGHT_TEST: '1',
      },
    },
  ],
});
