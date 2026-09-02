import { ADMIN_THEME_CHANGE_EVENT } from '@/constants';
import { useThemeStore } from '@/stores';
import type { ThemeName } from '@/types';

/**
 * 浏览器深色模式媒体查询
 */
const SYSTEM_DARK_THEME_QUERY = '(prefers-color-scheme: dark)';

/**
 * 根据系统颜色偏好解析实际主题
 *
 * @param prefersDark 系统是否偏好深色界面
 * @returns 对应的管理后台实际主题
 */
const resolveSystemThemeName = (prefersDark: boolean): ThemeName => (prefersDark ? 'dark' : 'light');

/**
 * 把实际主题同步到根节点并通知非 CSS 渲染资源
 *
 * @param value 需要应用到页面的深色或浅色主题
 * @param shouldEmit 是否广播主题变更事件；应用首次启动时还没有组件监听者，因此不需要广播
 */
const applyTheme = (value: ThemeName, shouldEmit = true): void => {
  document.documentElement.dataset.theme = value;
  if (shouldEmit) {
    window.dispatchEvent(new Event(ADMIN_THEME_CHANGE_EVENT));
  }
};

/**
 * 启动管理后台主题运行时
 *
 * 在 Vue 挂载前读取 `prefers-color-scheme`，应用 Store 中最终解析出的主题，并持续监听系统主题变化。
 * 只有主题偏好仍为 `system` 时才更新页面；用户已经明确选择深浅主题时只刷新系统快照。
 *
 * @param themeStore 应用唯一的主题 Store，启动阶段显式传入 Pinia 对应实例
 * @returns 移除系统主题监听的清理函数
 */
export const setupAdminTheme = (themeStore: ReturnType<typeof useThemeStore>): (() => void) => {
  const mediaQuery = window.matchMedia(SYSTEM_DARK_THEME_QUERY);
  themeStore.setSystemThemeName(resolveSystemThemeName(mediaQuery.matches));
  applyTheme(themeStore.themeName, false);

  const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    const previousThemeName = themeStore.themeName;
    themeStore.setSystemThemeName(resolveSystemThemeName(event.matches));

    if (themeStore.themePreference === 'system' && previousThemeName !== themeStore.themeName) {
      applyTheme(themeStore.themeName);
    }
  };

  mediaQuery.addEventListener('change', handleSystemThemeChange);
  return () => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange);
  };
};

/**
 * 管理后台主题 Composable
 *
 * 统一同步 Pinia 持久状态、根节点 `data-theme` 属性和主题变更事件。组件只能通过该 Composable
 * 主动切换主题，避免 DOM、Store 和需要重建的 WebGL 资源出现状态分叉。
 */
export const useTheme = () => {
  const themeStore = useThemeStore();
  const { themeName } = storeToRefs(themeStore);
  const isDarkTheme = computed(() => themeName.value === 'dark');

  /**
   * 应用指定主题并广播变更通知
   *
   * @param value 需要启用的主题
   */
  const setTheme = (value: ThemeName): void => {
    themeStore.setThemePreference(value);
    applyTheme(value);
  };

  /**
   * 在深色与浅色主题之间切换，并从触发元素中心播放圆形扩散动画
   *
   * 组件点击调用时传入浏览器事件以确定动画起点；没有事件、浏览器不支持 View Transition，
   * 或用户偏好减少动态效果时直接切换主题。
   *
   * @param event 可选的主题切换点击事件
   */
  const toggleTheme = async (event?: MouseEvent): Promise<void> => {
    const nextTheme: ThemeName = themeName.value === 'dark' ? 'light' : 'dark';
    const switchTheme = (): void => {
      setTheme(nextTheme);
    };
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!event || typeof document.startViewTransition !== 'function' || prefersReducedMotion) {
      switchTheme();
      return;
    }

    const triggerRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const originX = triggerRect.left + triggerRect.width / 2;
    const originY = triggerRect.top + triggerRect.height / 2;
    const radius = Math.hypot(
      Math.max(originX, window.innerWidth - originX),
      Math.max(originY, window.innerHeight - originY),
    );
    const transition = document.startViewTransition(switchTheme);

    await transition.ready;
    document.documentElement.animate(
      {
        clipPath: [`circle(0 at ${originX}px ${originY}px)`, `circle(${radius}px at ${originX}px ${originY}px)`],
      },
      {
        duration: 520,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  };

  return { themeName, isDarkTheme, setTheme, toggleTheme };
};
