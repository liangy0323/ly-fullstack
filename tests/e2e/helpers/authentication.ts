import { expect } from '@playwright/test';

import type { Page, Response } from '@playwright/test';

import { completeLoginCaptcha } from './login-captcha';

/**
 * 登录接口返回并被 E2E 使用的最小会话信息
 */
export interface E2eAdminSession {
  token: string;
  apiBaseUrl: string;
}

/**
 * 通过真实登录页和图片滑块完成管理员登录
 *
 * @param page 当前浏览器页面
 * @param username 测试环境注入的管理员账号
 * @param password 测试环境注入的管理员密码
 * @param targetPath 登录前访问的受保护路径
 * @param rememberUsername 是否勾选记住账号
 * @returns 登录 Token 与实际管理 API 地址
 */
export const loginViaUi = async (
  page: Page,
  username: string,
  password: string,
  targetPath = '/dashboard',
  rememberUsername = false,
): Promise<E2eAdminSession> => {
  await page.goto(targetPath);
  await expect(page.getByRole('heading', { name: '欢迎登录' })).toBeVisible();
  await page.getByRole('textbox', { name: '管理员账号' }).fill(username);
  await page.getByLabel('登录密码').fill(password);

  if (rememberUsername) {
    await page.getByText('记住账号', { exact: true }).click();
  }

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  );
  await completeLoginCaptcha(page);
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok(), `账号 ${username} 的登录接口必须成功`).toBe(true);

  const payload = (await loginResponse.json()) as { token?: string };
  if (!payload.token) {
    throw new Error(`账号 ${username} 的登录响应缺少 Token。`);
  }

  await expect(page).toHaveURL(new RegExp(`${targetPath.replaceAll('/', '\\/')}$`));
  return {
    token: payload.token,
    apiBaseUrl: `${new URL(loginResponse.url()).origin}/api`,
  };
};

/**
 * 提交一次预期失败的真实登录
 *
 * @param page 当前浏览器页面
 * @param username 测试账号
 * @param password 本次使用的错误密码
 * @returns 管理 API 登录响应
 */
export const submitInvalidLoginViaUi = async (page: Page, username: string, password: string): Promise<Response> => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: '管理员账号' }).fill(username);
  await page.getByLabel('登录密码').fill(password);

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  );
  await completeLoginCaptcha(page);
  return loginResponsePromise;
};

/**
 * 通过顶栏管理员菜单退出当前会话
 *
 * @param page 当前已登录页面
 */
export const logoutViaUi = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: '管理员菜单' }).click();
  await page.getByRole('menuitem', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/\/login$/);
};
