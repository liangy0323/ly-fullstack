import { beforeEach, describe, expect, it } from '@rstest/core';

import { useThemeStore } from './theme';

describe('主题 Store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
  });

  it('首次访问默认跟随系统主题', () => {
    const store = useThemeStore();

    expect(store.themePreference).toBe('system');
    expect(store.themeName).toBe('light');

    store.setSystemThemeName('dark');

    expect(store.themeName).toBe('dark');
  });

  it('兼容旧版本已经保存的明确主题选择', () => {
    window.localStorage.setItem('APP_PINIA_THEME', JSON.stringify({ themeName: 'light' }));
    setActivePinia(createPinia());

    const store = useThemeStore();
    store.setSystemThemeName('dark');

    expect(store.themePreference).toBe('light');
    expect(store.themeName).toBe('light');
  });

  it('用户明确选择主题后不再被系统主题覆盖', () => {
    const store = useThemeStore();
    store.setSystemThemeName('dark');
    store.setThemePreference('light');
    store.setSystemThemeName('dark');

    expect(store.themePreference).toBe('light');
    expect(store.themeName).toBe('light');
  });
});
