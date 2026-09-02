import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

import type { FullConfig } from '@playwright/test';

import { loginViaUi } from './helpers/authentication';
import { prepareE2eDatabase } from './helpers/database';
import { getE2eEnvironment } from './helpers/environment';

/**
 * 准备测试数据库并生成一次管理员浏览器认证状态
 *
 * 数据库 migration/seed 在严格安全校验之后执行且不进行 destructive reset。管理员仍通过真实登录页、
 * 验证码、JWT 与 RBAC 链路认证，生成的 storageState 只存在于被忽略的 test-results 临时目录。
 */
const globalSetup = async (config: FullConfig): Promise<void> => {
  const environment = getE2eEnvironment();
  await prepareE2eDatabase();
  await mkdir(dirname(environment.authStatePath), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: environment.adminUrl });
  const page = await context.newPage();
  const tracePath = resolve(process.cwd(), 'test-results/global-setup-trace.zip');
  const screenshotPath = resolve(process.cwd(), 'test-results/global-setup-failure.png');

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  try {
    await loginViaUi(page, environment.adminUsername, environment.adminPassword);
    await page.context().storageState({ path: environment.authStatePath });
    await context.tracing.stop();
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    await context.tracing.stop({ path: tracePath }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  const projectNames = config.projects.map((project) => project.name).join(', ');
  console.log(`管理员认证状态已生成，测试项目：${projectNames}。`);
};

export default globalSetup;
