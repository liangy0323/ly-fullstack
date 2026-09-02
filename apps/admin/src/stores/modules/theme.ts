import type { ThemeName, ThemePreference } from '@/types';

/**
 * 主题偏好的浏览器持久化键
 */
const THEME_STORAGE_KEY = 'APP_PINIA_THEME';

/**
 * 判断持久化值是否属于受支持的主题偏好
 *
 * @param value 本地存储中未经信任的字段值
 * @returns 值为 `system`、`dark` 或 `light` 时返回 `true`
 */
const isThemePreference = (value: unknown): value is ThemePreference => {
  return value === 'system' || value === 'dark' || value === 'light';
};

/**
 * 读取浏览器已经保存的主题偏好
 *
 * 兼容旧版本持久化的 `themeName` 字段，避免升级后覆盖用户已经明确选择的深浅主题。
 * 存储缺失、格式损坏或字段非法时回退到跟随系统，不让异常本地数据阻断应用启动。
 *
 * @returns 当前持久化偏好；首次访问或无效数据时返回 `system`
 */
const readPersistedThemePreference = (): ThemePreference => {
  try {
    const serialized = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!serialized) {
      return 'system';
    }

    const persistedState: unknown = JSON.parse(serialized);
    if (typeof persistedState !== 'object' || persistedState === null) {
      return 'system';
    }

    const state = persistedState as Record<string, unknown>;
    const preference = state.themePreference ?? state.themeName;
    return isThemePreference(preference) ? preference : 'system';
  } catch {
    return 'system';
  }
};

/**
 * 管理后台主题 Store
 *
 * 主题偏好是跨页面持久状态，系统主题和最终启用主题由 Store 统一派生。根节点属性更新、系统颜色
 * 监听和主题事件广播由 `use-theme` Composable 负责，Store 不直接操作 DOM 或注册浏览器事件。
 */
export const useThemeStore = defineStore(
  'theme',
  () => {
    /**
     * 用户选择的主题偏好
     *
     * 首次访问默认跟随系统；旧版本已经保存的 `dark` 或 `light` 会继续作为明确偏好使用。
     */
    const themePreference = ref<ThemePreference>(readPersistedThemePreference());

    /**
     * 操作系统当前使用的主题
     *
     * 应用启动时由 `setupAdminTheme` 通过 `prefers-color-scheme` 同步，浅色值只承担同步前的安全兜底。
     */
    const systemThemeName = ref<ThemeName>('light');

    /**
     * 当前真正应用到页面、Canvas 和 WebGL 的主题名称
     */
    const themeName = computed<ThemeName>(() => {
      return themePreference.value === 'system' ? systemThemeName.value : themePreference.value;
    });

    /**
     * 更新用户主题偏好
     *
     * 触发时机：用户主动执行明暗主题切换时。
     * 副作用：更新 Pinia 状态并触发持久化插件写入；DOM 属性和全局事件仍由 `useTheme` 负责。
     *
     * @param value 需要保存的主题偏好
     */
    const setThemePreference = (value: ThemePreference): void => {
      themePreference.value = value;
    };

    /**
     * 同步操作系统当前主题
     *
     * 即使用户已经选择明确主题也保留最新系统值，未来恢复 `system` 偏好时可以立即得到正确结果。
     *
     * @param value `prefers-color-scheme` 当前解析出的实际主题
     */
    const setSystemThemeName = (value: ThemeName): void => {
      systemThemeName.value = value;
    };

    return { themePreference, systemThemeName, themeName, setThemePreference, setSystemThemeName };
  },
  {
    persist: {
      key: THEME_STORAGE_KEY,
      pick: ['themePreference'],
    },
  },
);
