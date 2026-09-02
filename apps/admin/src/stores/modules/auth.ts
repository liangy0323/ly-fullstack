import { fetchAdminSession, loginAdmin } from '@/api';
import type { AdminLoginParams, AdminProfile, AdminSession, PermissionCode, RbacMenuNode } from '@repo/shared/types';

/**
 * 管理端认证与 RBAC 会话 Store
 *
 * 负责持久化 Access Token、当前管理员资料、菜单树和权限码，并在应用恢复时向 Admin API
 * 重新确认账号状态。请求服务通过启动阶段注入的读取函数获取 Token，Store 不依赖 Axios 实现或路由。
 */
export const useAuthStore = defineStore(
  'auth',
  () => {
    /**
     * Admin API 签发的 Access Token，由持久化插件保存到浏览器本地存储
     */
    const token = ref('');

    /**
     * 当前已登录管理员的非敏感资料
     */
    const user = ref<AdminProfile | null>(null);

    /**
     * 当前有效角色合并后的后台菜单树
     */
    const menus = ref<RbacMenuNode[]>([]);

    /**
     * 当前有效角色合并并去重后的按钮与接口权限码
     */
    const permissions = ref<PermissionCode[]>([]);

    /**
     * 当前页面生命周期内是否已经通过 `/auth/me` 或登录响应确认会话有效
     *
     * 该状态不持久化，浏览器刷新后必须重新向数据库确认账号、角色和权限状态。
     */
    const sessionReady = ref(false);

    /**
     * 是否存在可用于恢复会话的 Access Token
     *
     * 这里只表示本地拥有 Token，不代表后端仍接受该 Token；路由守卫还需要调用 `restoreSession`。
     */
    const isAuthenticated = computed(() => Boolean(token.value));

    /**
     * 应用 Admin API 返回的最新 RBAC 会话
     *
     * @param session 已通过后端 JWT、账号状态和角色状态校验的会话快照
     */
    const applySession = (session: AdminSession): void => {
      user.value = session.user;
      menus.value = session.menus;
      permissions.value = session.permissions;
      sessionReady.value = true;
    };

    /**
     * 使用账号密码登录并保存 Token 与权限会话
     *
     * 触发时机：登录页表单通过客户端校验后。
     * 副作用：发起登录请求并更新 Pinia 持久状态。请求服务会在下一次请求时读取最新 Token。
     * 请求失败时异常继续抛给页面，现有登录状态不会被部分写入。
     *
     * @param params 管理员登录名和只在本次请求中使用的明文密码
     */
    const login = async (params: AdminLoginParams): Promise<void> => {
      const result = await loginAdmin(params);
      token.value = result.token;
      applySession(result);
    };

    /**
     * 使用已持久化的 Token 恢复数据库最新会话
     *
     * 触发时机：路由守卫首次进入受保护页面且当前页面尚未确认会话时。
     * 副作用：调用 `/auth/me` 并用数据库最新角色、菜单和权限覆盖本地快照。
     * Token 缺失或后端拒绝 Token 时抛出异常，由路由守卫负责清理状态并跳转登录页。
     */
    const restoreSession = async (): Promise<void> => {
      if (!token.value) {
        throw new Error('缺少管理端 Access Token。');
      }

      applySession(await fetchAdminSession());
    };

    /**
     * 清除当前浏览器中的管理端登录状态
     *
     * 触发时机：用户主动退出或 Admin API 返回会话失效的 401。
     * 副作用：清空 Pinia 持久状态；路由跳转由调用方负责。
     */
    const logout = (): void => {
      token.value = '';
      user.value = null;
      menus.value = [];
      permissions.value = [];
      sessionReady.value = false;
    };

    return {
      token,
      user,
      menus,
      permissions,
      sessionReady,
      isAuthenticated,
      login,
      restoreSession,
      logout,
    };
  },
  {
    persist: {
      key: 'APP_PINIA_AUTH',
      pick: ['token', 'user', 'menus', 'permissions'],
    },
  },
);
