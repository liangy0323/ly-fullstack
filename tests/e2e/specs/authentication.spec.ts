import { expect, test } from '../fixtures/test';
import { loginViaUi, logoutViaUi, submitInvalidLoginViaUi } from '../helpers/authentication';
import { getE2eEnvironment } from '../helpers/environment';

const environment = getE2eEnvironment();

test.use({ storageState: { cookies: [], origins: [] } });

test('后台认证闭环：拦截未登录访问、拒绝错误密码、恢复会话并安全退出', async ({ context, page }) => {
  await test.step('未登录访问受保护页面时跳转登录并保留目标地址', async () => {
    await page.goto('/system/user');
    await expect(page).toHaveURL(/\/login\?redirect=\/system\/user$/);
    await expect(page.getByRole('heading', { name: '欢迎登录' })).toBeVisible();
  });

  await test.step('错误密码经过真实图片验证后仍被服务端拒绝', async () => {
    const response = await submitInvalidLoginViaUi(page, environment.adminUsername, 'E2E-invalid-password');
    expect(response.status()).toBe(401);
    await expect(page.getByText('用户名或密码错误')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  await test.step('正确账号完成 UI 登录并返回原受保护页面', async () => {
    await loginViaUi(page, environment.adminUsername, environment.adminPassword, '/system/user', true);
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();

    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === 'LY_FULLSTACK_ADMIN_USERNAME')?.value).toBe(
      environment.adminUsername,
    );
    expect(cookies.some((cookie) => cookie.name === 'LY_FULLSTACK_ADMIN_CREDENTIALS')).toBe(false);
  });

  await test.step('刷新后通过 auth/me 恢复数据库最新会话和动态菜单', async () => {
    const sessionResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith('/api/auth/me') && response.request().method() === 'GET',
    );
    await page.reload();
    expect((await sessionResponsePromise).ok()).toBe(true);
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();

    await page.getByRole('menuitem', { name: '角色管理' }).click();
    await expect(page).toHaveURL(/\/system\/role$/);
    await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible();
  });

  await test.step('退出后清除会话并重新保护后台路由', async () => {
    await logoutViaUi(page);
    await expect(page.getByRole('heading', { name: '欢迎登录' })).toBeVisible();
    await page.goto('/system/menu');
    await expect(page).toHaveURL(/\/login\?redirect=\/system\/menu$/);
  });
});
