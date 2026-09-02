import { expect, test } from '../fixtures/test';
import { cleanupRbacData, getAdminToken } from '../helpers/admin-api';
import { loginViaUi, logoutViaUi } from '../helpers/authentication';
import { getE2eEnvironment } from '../helpers/environment';

const environment = getE2eEnvironment();

test('五表 RBAC 全链路：仅授权工作台的角色无法看到或调用系统管理', async ({ page }) => {
  const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const roleName = `E2E受限角色${uniqueSuffix}`;
  const roleCode = `e2e_limited_${uniqueSuffix}`;
  const username = `e2e_rbac_${uniqueSuffix}`;
  const password = `E2e#${uniqueSuffix}pass`;
  let adminToken = '';

  try {
    await test.step('超级管理员从 storageState 恢复会话并创建受限角色', async () => {
      await page.goto('/system/role');
      await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible();
      adminToken = await getAdminToken(page);

      await page.getByRole('button', { name: '新增角色' }).click();
      const roleDialog = page.getByRole('dialog', { name: '新增角色' });
      await roleDialog.getByLabel('角色名称').fill(roleName);
      await roleDialog.getByLabel('角色编码').fill(roleCode);
      await roleDialog.getByRole('button', { name: '保存' }).click();
      await expect(roleDialog).toBeHidden();
      await expect(page.getByRole('row').filter({ hasText: roleCode })).toBeVisible();
    });

    await test.step('角色只分配工作台，不分配系统管理与按钮权限', async () => {
      const roleRow = page.getByRole('row').filter({ hasText: roleCode });
      await roleRow.getByRole('button', { name: '菜单权限' }).click();
      const permissionDialog = page.getByRole('dialog', { name: `分配菜单权限 - ${roleName}` });
      await permissionDialog.getByText('工作台', { exact: true }).click();

      const dashboardNode = permissionDialog.getByRole('treeitem', { name: '工作台' });
      await expect(dashboardNode.locator(':scope > .el-tree-node__content input[type="checkbox"]')).toBeChecked();
      const systemNode = permissionDialog.getByRole('treeitem', { name: '系统管理' });
      await expect(systemNode.locator(':scope > .el-tree-node__content input[type="checkbox"]')).not.toBeChecked();

      await permissionDialog.getByRole('button', { name: '保存' }).click();
      await expect(permissionDialog).toBeHidden();
    });

    await test.step('创建测试用户并绑定受限角色', async () => {
      await page.goto('/system/user');
      await page.getByRole('button', { name: '新增用户' }).click();
      const userDialog = page.getByRole('dialog', { name: '新增用户' });
      await userDialog.getByLabel('登录名').fill(username);
      await userDialog.getByLabel('初始密码').fill(password);
      await userDialog.getByLabel('显示名称').fill('E2E 权限验证用户');
      await userDialog.getByRole('button', { name: '保存' }).click();
      await expect(userDialog).toBeHidden();

      const userRow = page.getByRole('row').filter({ hasText: username });
      await userRow.getByRole('button', { name: '分配角色' }).click();
      const assignDialog = page.getByRole('dialog', { name: '分配角色' });
      await assignDialog.getByText('请选择角色').click();
      await page.getByRole('option', { name: roleName }).click();
      await page.keyboard.press('Escape');
      await assignDialog.getByRole('button', { name: '保存' }).click();
      await expect(assignDialog).toBeHidden();
      await expect(userRow).toContainText(roleName);
    });

    await test.step('受限用户只能看到工作台，系统管理菜单不可见', async () => {
      await logoutViaUi(page);
      const userSession = await loginViaUi(page, username, password);
      await expect(page.getByRole('region', { name: '核心指标' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: '系统管理' })).toHaveCount(0);
      await expect(page.getByRole('menuitem', { name: '用户管理' })).toHaveCount(0);

      const listResponse = await page.request.get(`${userSession.apiBaseUrl}/users`, {
        params: { pageNum: 1, pageSize: 10 },
        headers: { Authorization: `Bearer ${userSession.token}` },
      });
      expect(listResponse.status()).toBe(403);
    });
  } finally {
    if (adminToken) {
      await cleanupRbacData(page.request, environment.adminApiUrl, adminToken, username, roleCode);
    }
  }
});
