import type { APIRequestContext, Page } from '@playwright/test';

interface AdminCleanupTargets {
  username?: string;
  roleCode?: string;
  dictionaryCode?: string;
  publicConfigKey?: string;
  menuName?: string;
}

interface AdminMenuNode {
  id: number;
  name: string;
  children: AdminMenuNode[];
}

/**
 * 从 Pinia 持久化状态读取当前管理员 Token
 *
 * @param page 已通过 storageState 恢复管理员会话的页面
 * @returns 只在当前测试进程内使用的 Bearer Token
 */
export const getAdminToken = async (page: Page): Promise<string> => {
  const token = await page.evaluate(() => {
    const rawState = window.localStorage.getItem('APP_PINIA_AUTH');
    if (!rawState) {
      return '';
    }

    const state = JSON.parse(rawState) as { token?: unknown };
    return typeof state.token === 'string' ? state.token : '';
  });

  if (!token) {
    throw new Error('storageState 中缺少管理员 Token。');
  }
  return token;
};

/**
 * 删除 RBAC 测试创建的用户和角色
 *
 * 清理失败会直接抛出，不能用 catch 掩盖残留数据。用户必须先于角色删除，避免触发角色绑定保护。
 *
 * @param request Playwright API 请求上下文
 * @param adminApiUrl 管理 API 基础地址
 * @param adminToken 超级管理员 Token
 * @param username 唯一测试用户名
 * @param roleCode 唯一测试角色编码
 */
export const cleanupRbacData = async (
  request: APIRequestContext,
  adminApiUrl: string,
  adminToken: string,
  username: string,
  roleCode: string,
): Promise<void> => {
  const headers = { Authorization: `Bearer ${adminToken}` };
  const usersResponse = await request.get(`${adminApiUrl}/users`, {
    headers,
    params: { pageNum: 1, pageSize: 10, keyword: username },
  });
  if (!usersResponse.ok()) {
    throw new Error(`RBAC 用户清理查询失败：HTTP ${usersResponse.status()}`);
  }
  const users = (await usersResponse.json()) as { list: Array<{ id: number; username: string }> };
  for (const user of users.list.filter((item) => item.username === username)) {
    const response = await request.delete(`${adminApiUrl}/users/${user.id}`, { headers });
    if (!response.ok()) {
      throw new Error(`RBAC 用户清理失败：HTTP ${response.status()}`);
    }
  }

  const rolesResponse = await request.get(`${adminApiUrl}/roles`, {
    headers,
    params: { pageNum: 1, pageSize: 10, keyword: roleCode },
  });
  if (!rolesResponse.ok()) {
    throw new Error(`RBAC 角色清理查询失败：HTTP ${rolesResponse.status()}`);
  }
  const roles = (await rolesResponse.json()) as { list: Array<{ id: number; code: string }> };
  for (const role of roles.list.filter((item) => item.code === roleCode)) {
    const response = await request.delete(`${adminApiUrl}/roles/${role.id}`, { headers });
    if (!response.ok()) {
      throw new Error(`RBAC 角色清理失败：HTTP ${response.status()}`);
    }
  }
};

/**
 * 清理后台模块用例可能留下的唯一测试数据
 *
 * 正常流程仍通过 UI 删除；finally 再按稳定业务键查询，确保中途断言失败不会污染后续运行。任何清理
 * 请求失败都会抛出，让报告同时暴露原始失败与数据残留风险。
 *
 * @param request Playwright API 请求上下文
 * @param adminApiUrl 管理 API 基础地址
 * @param adminToken 超级管理员 Token
 * @param targets 本次用例创建的唯一业务键
 */
export const cleanupAdminData = async (
  request: APIRequestContext,
  adminApiUrl: string,
  adminToken: string,
  targets: AdminCleanupTargets,
): Promise<void> => {
  if (targets.username || targets.roleCode) {
    await cleanupRbacData(
      request,
      adminApiUrl,
      adminToken,
      targets.username || '__no_e2e_user__',
      targets.roleCode || '__no_e2e_role__',
    );
  }

  const headers = { Authorization: `Bearer ${adminToken}` };
  if (targets.dictionaryCode) {
    const response = await request.get(`${adminApiUrl}/dictionaries`, {
      headers,
      params: { pageNum: 1, pageSize: 10, keyword: targets.dictionaryCode },
    });
    if (!response.ok()) {
      throw new Error(`字典清理查询失败：HTTP ${response.status()}`);
    }
    const payload = (await response.json()) as { list: Array<{ id: number; code: string }> };
    for (const dictionary of payload.list.filter((item) => item.code === targets.dictionaryCode)) {
      const deleteResponse = await request.delete(`${adminApiUrl}/dictionaries/${dictionary.id}`, { headers });
      if (!deleteResponse.ok()) {
        throw new Error(`字典清理失败：HTTP ${deleteResponse.status()}`);
      }
    }
  }

  if (targets.publicConfigKey) {
    const response = await request.get(`${adminApiUrl}/public-configs`, {
      headers,
      params: { pageNum: 1, pageSize: 10, keyword: targets.publicConfigKey },
    });
    if (!response.ok()) {
      throw new Error(`公共配置清理查询失败：HTTP ${response.status()}`);
    }
    const payload = (await response.json()) as { list: Array<{ id: number; key: string }> };
    for (const config of payload.list.filter((item) => item.key === targets.publicConfigKey)) {
      const deleteResponse = await request.delete(`${adminApiUrl}/public-configs/${config.id}`, { headers });
      if (!deleteResponse.ok()) {
        throw new Error(`公共配置清理失败：HTTP ${deleteResponse.status()}`);
      }
    }
  }

  if (targets.menuName) {
    const response = await request.get(`${adminApiUrl}/menus/tree`, { headers });
    if (!response.ok()) {
      throw new Error(`菜单清理查询失败：HTTP ${response.status()}`);
    }
    const roots = (await response.json()) as AdminMenuNode[];
    const pending = [...roots];
    while (pending.length) {
      const menu = pending.pop();
      if (!menu) {
        continue;
      }
      pending.push(...menu.children);
      if (menu.name === targets.menuName) {
        const deleteResponse = await request.delete(`${adminApiUrl}/menus/${menu.id}`, { headers });
        if (!deleteResponse.ok()) {
          throw new Error(`菜单清理失败：HTTP ${deleteResponse.status()}`);
        }
      }
    }
  }
};
