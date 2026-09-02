import { beforeEach, describe, expect, it, rstest } from '@rstest/core';

import { fetchAdminSession, loginAdmin } from '@/api';
import { useAuthStore } from './auth';

import type { AdminLoginResponse, AdminSession, RbacMenuNode } from '@repo/shared/types';

rstest.mock('@/api', () => ({
  loginAdmin: rstest.fn(),
  fetchAdminSession: rstest.fn(),
}));

/**
 * 构造一份完整的 RBAC 会话夹具
 *
 * @param overrides 需要覆盖的字段，用于区分不同用例的会话内容
 * @returns 可以直接提交给 Store 的会话快照
 */
const createSession = (overrides: Partial<AdminSession> = {}): AdminSession => {
  const menus: RbacMenuNode[] = [
    {
      id: 1,
      name: '工作台',
      type: 'MENU',
      routePath: '/dashboard',
      routeName: 'dashboard',
      component: 'dashboard/index',
      icon: 'LayoutDashboard',
      permissionCode: null,
      sortOrder: 1,
      children: [],
    },
  ];

  return {
    user: {
      id: 1,
      username: 'admin',
      displayName: '管理员',
      roles: [{ id: 1, name: '超级管理员', code: 'super_admin' }],
    },
    menus,
    permissions: ['system:user:list'],
    ...overrides,
  };
};

describe('认证 Store', () => {
  beforeEach(() => {
    // 每个用例使用独立的 Pinia 实例，禁止共享上一用例的认证状态
    setActivePinia(createPinia());
    rstest.resetAllMocks();
  });

  it('登录成功后保存 Token、用户、菜单、权限并标记会话就绪', async () => {
    const response: AdminLoginResponse = { token: 'jwt-token', ...createSession() };
    rstest.mocked(loginAdmin).mockResolvedValue(response);

    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);

    await store.login({ username: 'admin', password: 'admin123', captchaId: 'captcha-id' });

    expect(store.token).toBe('jwt-token');
    expect(store.user).toEqual(response.user);
    expect(store.menus).toEqual(response.menus);
    expect(store.permissions).toEqual(response.permissions);
    expect(store.sessionReady).toBe(true);
    expect(store.isAuthenticated).toBe(true);
  });

  it('登录失败时不写入任何半成品认证状态', async () => {
    rstest.mocked(loginAdmin).mockRejectedValue(new Error('用户名或密码错误'));

    const store = useAuthStore();
    store.menus = createSession().menus;

    await expect(store.login({ username: 'admin', password: 'wrong', captchaId: 'captcha-id' })).rejects.toThrow(
      '用户名或密码错误',
    );

    expect(store.token).toBe('');
    expect(store.user).toBeNull();
    // 登录前的旧菜单快照保持原样，不能被失败请求清空或部分覆盖
    expect(store.menus).toHaveLength(1);
    expect(store.sessionReady).toBe(false);
    expect(store.isAuthenticated).toBe(false);
  });

  it('缺少 Token 时 restoreSession 立即失败且不发起会话请求', async () => {
    const store = useAuthStore();

    await expect(store.restoreSession()).rejects.toThrow('缺少管理端 Access Token。');
    expect(fetchAdminSession).not.toHaveBeenCalled();
  });

  it('restoreSession 成功后用服务端最新会话覆盖旧状态', async () => {
    const staleSession = createSession();
    const latestSession = createSession({
      user: { id: 2, username: 'editor', displayName: '编辑', roles: [{ id: 2, name: '内容编辑', code: 'editor' }] },
      permissions: ['system:role:list', 'system:role:create'],
    });

    const store = useAuthStore();
    store.token = 'stale-token';
    store.user = staleSession.user;
    store.permissions = staleSession.permissions;

    rstest.mocked(fetchAdminSession).mockResolvedValue(latestSession);
    await store.restoreSession();

    expect(fetchAdminSession).toHaveBeenCalledTimes(1);
    // 旧快照必须整体替换，禁止新旧权限集合合并造成越权或残留
    expect(store.user).toEqual(latestSession.user);
    expect(store.permissions).toEqual(latestSession.permissions);
    expect(store.token).toBe('stale-token');
    expect(store.sessionReady).toBe(true);
  });

  it('restoreSession 失败时保留旧状态并抛出异常', async () => {
    const store = useAuthStore();
    store.token = 'expired-token';
    store.permissions = ['system:user:list'];

    rstest.mocked(fetchAdminSession).mockRejectedValue(new Error('会话已失效'));
    await expect(store.restoreSession()).rejects.toThrow('会话已失效');

    expect(store.token).toBe('expired-token');
    expect(store.permissions).toEqual(['system:user:list']);
    expect(store.sessionReady).toBe(false);
  });

  it('logout 完整清理认证状态', async () => {
    const response: AdminLoginResponse = { token: 'jwt-token', ...createSession() };
    rstest.mocked(loginAdmin).mockResolvedValue(response);

    const store = useAuthStore();
    await store.login({ username: 'admin', password: 'admin123', captchaId: 'captcha-id' });
    store.logout();

    expect(store.token).toBe('');
    expect(store.user).toBeNull();
    expect(store.menus).toEqual([]);
    expect(store.permissions).toEqual([]);
    expect(store.sessionReady).toBe(false);
    expect(store.isAuthenticated).toBe(false);
  });
});
