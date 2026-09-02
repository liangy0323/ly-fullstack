import type { Pinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

export * from './modules/theme';
export * from './modules/auth';

/**
 * 管理后台 Pinia 实例
 *
 * 在应用挂载前统一注册持久化插件，使主题与认证 Store 可以声明自己的持久化字段边界。
 */
const pinia: Pinia = createPinia();

/**
 * 注册 Pinia 持久化插件
 *
 * 插件只处理各 Store 在 `persist.pick` 中显式列出的状态，运行期会话确认状态不会写入本地存储。
 */
pinia.use(piniaPluginPersistedstate);

/**
 * 导出应用唯一的 Pinia 实例，供应用入口和路由守卫共享同一状态容器。
 */
export default pinia;
