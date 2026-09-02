import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/test';
import { cleanupAdminData, getAdminToken } from '../helpers/admin-api';
import { getE2eEnvironment } from '../helpers/environment';

const environment = getE2eEnvironment();

/**
 * 点击 Element Plus 确认框中的危险操作按钮
 *
 * @param page 当前页面
 */
const confirmDeletion = async (page: Page): Promise<void> => {
  const confirmDialog = page.getByRole('dialog', { name: /^删除/ });
  await confirmDialog.getByRole('button', { name: /^(删除|确定)$/ }).click();
};

test('用户管理闭环：校验、新增、搜索、编辑、服务端冲突反馈与删除', async ({ page }) => {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const username = 'e2e_user_' + suffix;
  const password = 'E2e#' + suffix + 'pass';
  const displayName = 'E2E用户' + suffix;
  const updatedDisplayName = displayName + '已更新';
  let adminToken = '';

  try {
    await test.step('空表单展示前端校验，再创建唯一普通用户', async () => {
      await page.goto('/system/user');
      await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();
      adminToken = await getAdminToken(page);

      await page.getByRole('button', { name: '新增用户' }).click();
      const dialog = page.getByRole('dialog', { name: '新增用户' });
      await dialog.getByRole('button', { name: '保存' }).click();
      await expect(dialog.getByText('请输入登录名')).toBeVisible();
      await expect(dialog.getByText('请输入初始密码')).toBeVisible();

      await dialog.getByLabel('登录名').fill(username);
      await dialog.getByLabel('初始密码').fill(password);
      await dialog.getByLabel('显示名称').fill(displayName);
      await dialog.getByRole('button', { name: '保存' }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText('用户已创建，请继续分配角色')).toBeVisible();
    });

    await test.step('按登录名搜索并编辑显示名称', async () => {
      const filterPanel = page.getByRole('region', { name: '数据筛选' });
      await filterPanel.getByLabel('关键词').fill(username);
      await filterPanel.getByRole('button', { name: '查询' }).click();
      const row = page.getByRole('row').filter({ hasText: username });
      await expect(row).toBeVisible();

      await row.getByRole('button', { name: '编辑' }).click();
      const dialog = page.getByRole('dialog', { name: '编辑用户' });
      await dialog.getByLabel('显示名称').fill(updatedDisplayName);
      await dialog.getByRole('button', { name: '保存' }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText('用户已更新')).toBeVisible();
      await expect(row).toContainText(updatedDisplayName);
    });

    await test.step('重复登录名由服务端拒绝并展示明确反馈', async () => {
      await page.getByRole('button', { name: '新增用户' }).click();
      const dialog = page.getByRole('dialog', { name: '新增用户' });
      await dialog.getByLabel('登录名').fill(username);
      await dialog.getByLabel('初始密码').fill(password);
      await dialog.getByLabel('显示名称').fill('重复用户');
      const conflictResponsePromise = page.waitForResponse(
        (response) => response.url().endsWith('/api/users') && response.request().method() === 'POST',
      );
      await dialog.getByRole('button', { name: '保存' }).click();
      expect((await conflictResponsePromise).status()).toBe(409);
      await expect(page.getByText('登录名已存在')).toBeVisible();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: '取消' }).click();
    });

    await test.step('刷新后数据仍存在，删除后列表查询为空', async () => {
      await page.reload();
      const filterPanel = page.getByRole('region', { name: '数据筛选' });
      await filterPanel.getByLabel('关键词').fill(username);
      await filterPanel.getByRole('button', { name: '查询' }).click();
      const row = page.getByRole('row').filter({ hasText: username });
      await expect(row).toContainText(updatedDisplayName);
      await row.getByRole('button', { name: '删除' }).click();
      await confirmDeletion(page);
      await expect(page.getByText('用户已删除')).toBeVisible();
      await expect(row).toHaveCount(0);
    });
  } finally {
    if (adminToken) {
      await cleanupAdminData(page.request, environment.adminApiUrl, adminToken, { username });
    }
  }
});

test('菜单管理闭环：创建根目录、搜索、编辑并删除', async ({ page }) => {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const menuName = 'E2E目录' + suffix;
  const updatedMenuName = menuName + '更新';
  let adminToken = '';

  try {
    await test.step('创建唯一根目录并由后端刷新菜单树', async () => {
      await page.goto('/system/menu');
      await expect(page.getByRole('heading', { name: '菜单结构' })).toBeVisible();
      adminToken = await getAdminToken(page);
      await page.getByRole('button', { name: '新建根节点' }).click();
      await page.getByRole('menuitem', { name: '新建目录' }).click();
      await page.getByLabel('名称').fill(menuName);
      await page.getByRole('button', { name: '保存' }).click();
      await expect(page.getByText('菜单已创建')).toBeVisible();
      await expect(page.getByRole('tree').getByText(menuName, { exact: true })).toBeVisible();
    });

    await test.step('搜索定位节点并更新名称', async () => {
      await page.getByPlaceholder('搜索菜单名称').fill(menuName);
      await page.getByRole('tree').getByText(menuName, { exact: true }).click();
      const nameInput = page.getByLabel('名称');
      await expect(nameInput).toHaveValue(menuName);
      await nameInput.fill(updatedMenuName);
      await page.getByRole('button', { name: '保存' }).click();
      await expect(page.getByText('菜单已更新')).toBeVisible();
      await page.getByPlaceholder('搜索菜单名称').fill(updatedMenuName);
      await expect(page.getByRole('tree').getByText(updatedMenuName, { exact: true })).toBeVisible();
    });

    await test.step('删除根目录并确认菜单树同步移除', async () => {
      const node = page.getByRole('treeitem').filter({ hasText: updatedMenuName });
      await node.getByRole('button', { name: '删除节点' }).click();
      await confirmDeletion(page);
      await expect(page.getByText('菜单已删除')).toBeVisible();
      await expect(page.getByRole('tree').getByText(updatedMenuName, { exact: true })).toHaveCount(0);
    });
  } finally {
    if (adminToken) {
      await cleanupAdminData(page.request, environment.adminApiUrl, adminToken, { menuName });
      await cleanupAdminData(page.request, environment.adminApiUrl, adminToken, { menuName: updatedMenuName });
    }
  }
});

test('字典管理闭环：维护字典项并通过默认 API 公开读取', async ({ page, request }) => {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const dictionaryName = 'E2E字典' + suffix;
  const dictionaryCode = 'e2e_dictionary_' + suffix;
  const itemLabel = '选项' + suffix;
  const updatedItemLabel = itemLabel + '更新';
  const itemValue = 'value_' + suffix;
  let adminToken = '';

  try {
    await test.step('创建字典并通过筛选定位', async () => {
      await page.goto('/system/dictionary');
      adminToken = await getAdminToken(page);
      await page.getByRole('button', { name: '新增字典' }).click();
      const dialog = page.getByRole('dialog', { name: '新增字典' });
      await dialog.getByLabel('字典名称').fill(dictionaryName);
      await dialog.getByLabel('字典编码').fill(dictionaryCode);
      await dialog.getByLabel('字典说明').fill('Playwright 公开字典闭环');
      await dialog.getByRole('button', { name: '保存' }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText('字典已创建')).toBeVisible();

      const filterPanel = page.getByRole('region', { name: '数据筛选' });
      await filterPanel.getByLabel('关键词').fill(dictionaryCode);
      await filterPanel.getByRole('button', { name: '查询' }).click();
      await expect(page.getByRole('row').filter({ hasText: dictionaryCode })).toBeVisible();
    });

    await test.step('新增并编辑字典项，默认 API 返回数据库最新值', async () => {
      const dictionaryRow = page.getByRole('row').filter({ hasText: dictionaryCode });
      await dictionaryRow.getByRole('button', { name: '字典项' }).click();
      const itemDialog = page.getByRole('dialog', { name: dictionaryName + ' · 字典项' });
      await itemDialog.getByRole('button', { name: '新增字典项' }).click();
      const formDialog = page.getByRole('dialog', { name: '新增字典项' });
      await formDialog.getByLabel('展示文本').fill(itemLabel);
      await formDialog.getByLabel('字典值').fill(itemValue);
      await formDialog.getByRole('button', { name: '保存' }).click();
      await expect(formDialog).toBeHidden();
      await expect(page.getByText('字典项已创建')).toBeVisible();

      const publicResponse = await request.get(environment.apiUrl + '/public/dictionaries/' + dictionaryCode);
      expect(publicResponse.ok()).toBe(true);
      expect(await publicResponse.json()).toMatchObject({
        code: dictionaryCode,
        name: dictionaryName,
        items: [{ label: itemLabel, value: itemValue }],
      });

      const itemRow = itemDialog.getByRole('row').filter({ hasText: itemValue });
      await itemRow.getByRole('button', { name: '编辑' }).click();
      const editDialog = page.getByRole('dialog', { name: '编辑字典项' });
      await editDialog.getByLabel('展示文本').fill(updatedItemLabel);
      await editDialog.getByRole('button', { name: '保存' }).click();
      await expect(editDialog).toBeHidden();
      await expect(itemRow).toContainText(updatedItemLabel);

      const updatedPublicResponse = await request.get(environment.apiUrl + '/public/dictionaries/' + dictionaryCode);
      expect(await updatedPublicResponse.json()).toMatchObject({
        items: [{ label: updatedItemLabel, value: itemValue }],
      });
    });

    await test.step('删除字典项和字典，公开接口随后返回不存在', async () => {
      const itemDialog = page.getByRole('dialog', { name: dictionaryName + ' · 字典项' });
      const itemRow = itemDialog.getByRole('row').filter({ hasText: itemValue });
      await itemRow.getByRole('button', { name: '删除' }).click();
      await confirmDeletion(page);
      await expect(page.getByText('字典项已删除')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(itemDialog).toBeHidden();

      const dictionaryRow = page.getByRole('row').filter({ hasText: dictionaryCode });
      await dictionaryRow.getByRole('button', { name: '删除' }).click();
      await confirmDeletion(page);
      await expect(page.getByText('字典已删除')).toBeVisible();
      const publicResponse = await request.get(environment.apiUrl + '/public/dictionaries/' + dictionaryCode);
      expect(publicResponse.status()).toBe(404);
    });
  } finally {
    if (adminToken) {
      await cleanupAdminData(page.request, environment.adminApiUrl, adminToken, { dictionaryCode });
    }
  }
});

test('公共配置闭环：新增、搜索、编辑、刷新持久化并由默认 API 公开读取', async ({ page, request }) => {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const configKey = 'e2e.feature.' + suffix;
  const initialValue = 'initial-' + suffix;
  const updatedValue = 'updated-' + suffix;
  let adminToken = '';

  try {
    await test.step('创建公共配置并验证公开读取', async () => {
      await page.goto('/system/config');
      adminToken = await getAdminToken(page);
      await page.getByRole('button', { name: '新增配置' }).click();
      const dialog = page.getByRole('dialog', { name: '新增公共配置' });
      await dialog.getByLabel('配置键').fill(configKey);
      await dialog.getByLabel('配置值').fill(initialValue);
      await dialog.getByLabel('配置说明').fill('Playwright 公共配置闭环');
      await dialog.getByRole('button', { name: '保存' }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText('公共配置已创建')).toBeVisible();

      const publicResponse = await request.get(environment.apiUrl + '/public/configs/' + configKey);
      expect(publicResponse.ok()).toBe(true);
      expect(await publicResponse.json()).toEqual({ key: configKey, value: initialValue });
    });

    await test.step('按键搜索、编辑并刷新确认持久化', async () => {
      const filterPanel = page.getByRole('region', { name: '数据筛选' });
      await filterPanel.getByLabel('关键词').fill(configKey);
      await filterPanel.getByRole('button', { name: '查询' }).click();
      let row = page.getByRole('row').filter({ hasText: configKey });
      await row.getByRole('button', { name: '编辑' }).click();
      const dialog = page.getByRole('dialog', { name: '编辑公共配置' });
      await dialog.getByLabel('配置值').fill(updatedValue);
      await dialog.getByRole('button', { name: '保存' }).click();
      await expect(page.getByText('公共配置已更新')).toBeVisible();

      await page.reload();
      const refreshedFilterPanel = page.getByRole('region', { name: '数据筛选' });
      await refreshedFilterPanel.getByLabel('关键词').fill(configKey);
      await refreshedFilterPanel.getByRole('button', { name: '查询' }).click();
      row = page.getByRole('row').filter({ hasText: configKey });
      await expect(row).toContainText(updatedValue);

      const publicResponse = await request.get(environment.apiUrl + '/public/configs/' + configKey);
      expect(await publicResponse.json()).toEqual({ key: configKey, value: updatedValue });
    });

    await test.step('删除配置后公开接口返回不存在', async () => {
      const row = page.getByRole('row').filter({ hasText: configKey });
      await row.getByRole('button', { name: '删除' }).click();
      await confirmDeletion(page);
      await expect(page.getByText('公共配置已删除')).toBeVisible();
      const publicResponse = await request.get(environment.apiUrl + '/public/configs/' + configKey);
      expect(publicResponse.status()).toBe(404);
    });
  } finally {
    if (adminToken) {
      await cleanupAdminData(page.request, environment.adminApiUrl, adminToken, { publicConfigKey: configKey });
    }
  }
});
