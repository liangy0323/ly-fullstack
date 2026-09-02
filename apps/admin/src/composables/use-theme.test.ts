import { beforeEach, describe, expect, it, rstest } from '@rstest/core';

import { ADMIN_THEME_CHANGE_EVENT } from '@/constants';
import { useThemeStore as createThemeStore } from '@/stores/modules/theme';
import { setupAdminTheme, useTheme } from './use-theme';

let themeStore: ReturnType<typeof createThemeStore>;

rstest.mock('@/stores', () => ({
  useThemeStore: () => themeStore,
}));

describe('主题 Composable', () => {
  let systemThemeListener: ((event: MediaQueryListEvent) => void) | undefined;
  let mediaQuery: MediaQueryList;

  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    themeStore = createThemeStore();
    systemThemeListener = undefined;
    mediaQuery = {
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: rstest.fn((_type, listener) => {
        systemThemeListener = listener as (event: MediaQueryListEvent) => void;
      }),
      removeEventListener: rstest.fn(),
      addListener: rstest.fn(),
      removeListener: rstest.fn(),
      dispatchEvent: rstest.fn(),
    };
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: rstest.fn(() => mediaQuery),
    });
  });

  it('启动时应用系统主题并在系统变化时实时同步', () => {
    const disposeTheme = setupAdminTheme(themeStore);

    expect(themeStore.themePreference).toBe('system');
    expect(themeStore.themeName).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    systemThemeListener?.({ matches: false } as MediaQueryListEvent);

    expect(themeStore.themeName).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    disposeTheme();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', systemThemeListener);
  });

  it('用户主动切换后保留明确主题，不再跟随系统变化', () => {
    const disposeTheme = setupAdminTheme(themeStore);
    const { setTheme } = useTheme();
    const themeChangeListener = rstest.fn();
    window.addEventListener(ADMIN_THEME_CHANGE_EVENT, themeChangeListener, { once: true });

    setTheme('light');
    systemThemeListener?.({ matches: true } as MediaQueryListEvent);

    expect(themeStore.themePreference).toBe('light');
    expect(themeStore.themeName).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(themeChangeListener).toHaveBeenCalledTimes(1);

    disposeTheme();
  });
});
