import js from '@eslint/js';
import prettier from '@vue/eslint-config-prettier';
import { globalIgnores } from 'eslint/config';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import tseslint from 'typescript-eslint';

import { getWorkspaceApplications, readWorkspaceConfig } from './scripts/workspace-config.mjs';

/**
 * 从自动导入声明文件中提取全局变量名
 *
 * Rsbuild 的 unplugin-auto-import 会把 Vue、Vue Router、Pinia 与 Element Plus API 写入
 * `auto-imports.d.ts`。ESLint 不读取该声明，这里解析出变量名注册为全局只读，避免源码中的
 * 自动导入被误报为 undefined。
 *
 * @param dtsPath 自动导入声明文件的绝对路径
 * @returns 变量名到 readonly 的映射；文件不存在时返回空对象
 */
const createAutoImportGlobals = (dtsPath) => {
  if (!existsSync(dtsPath)) {
    return {};
  }

  const autoImportDts = readFileSync(dtsPath, 'utf-8');
  const names = [...autoImportDts.matchAll(/^\s*const\s+([A-Za-z_$][\w$]*)\s*:/gm)].map((match) => match[1]);

  return Object.fromEntries(names.map((name) => [name, 'readonly']));
};

/**
 * 管理后台自动导入的全局变量
 *
 * 声明文件不存在时为空对象，首次安装或生成类型前执行 ESLint 也不会中断配置加载。
 */
const adminVueAutoImportGlobals = createAutoImportGlobals(join(import.meta.dirname, 'apps/admin/auto-imports.d.ts'));

/**
 * 配置表中所有 NestJS 服务的源码范围
 *
 * 服务由生成器动态增加，ESLint 不能依赖写死的 api 应用名。
 */
const serverSourceGlobs = getWorkspaceApplications(readWorkspaceConfig(import.meta.dirname))
  .filter((app) => app.kind === 'server')
  .map((app) => `${app.path}/src/**/*.ts`);

/**
 * LY Fullstack 仓库级 ESLint 扁平配置
 *
 * 单一根配置统一维护 TypeScript、Vue、Prettier 与运行环境规则，不再通过 workspace 配置包间接加载。
 */
export default tseslint.config(
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/.rsbuild/**',
    'packages/database/generated/prisma/**',
    'playwright-report/**',
    'test-results/**',
    'website/doc_build/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.{ts,tsx,vue,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'vue/no-mutating-props': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['apps/admin/src/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...adminVueAutoImportGlobals,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'vue',
              allowTypeImports: true,
              message: 'Vue 运行时 API 必须使用自动导入；仅允许 import type。',
            },
            {
              name: 'pinia',
              allowTypeImports: true,
              message: 'Pinia 运行时 API 必须使用自动导入；仅允许 import type。',
            },
            {
              name: 'vue-router',
              importNames: ['onBeforeRouteLeave', 'onBeforeRouteUpdate', 'useLink', 'useRoute', 'useRouter'],
              message: 'Vue Router Composable 必须使用自动导入。',
            },
            {
              name: 'element-plus',
              allowTypeImports: true,
              message: 'Element Plus 运行时 API 和组件必须使用自动导入；仅允许 import type。',
            },
            {
              name: 'element-plus/es',
              allowTypeImports: true,
              message: 'Element Plus 运行时 API 和组件必须使用自动导入；仅允许 import type。',
            },
          ],
          patterns: [
            {
              group: ['element-plus/es/components/**', 'element-plus/theme-chalk/**'],
              allowTypeImports: true,
              message: '禁止绕过 ElementPlusResolver 手动加载组件或样式入口。',
            },
          ],
        },
      ],
    },
  },
  /**
   * Service Worker 模板运行在 WorkerGlobalScope，不具备普通浏览器 Window 或 Node.js 全局对象。
   */
  {
    files: ['apps/admin/build/runtime/offline/sw-template.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    files: [
      ...serverSourceGlobs,
      'apps/admin/build/**/*.ts',
      'packages/*/src/**/*.ts',
      'packages/*/*.ts',
      'scripts/**/*.{js,mjs,cjs}',
      '*.{js,mjs,cjs,ts}',
      'apps/*/*.{js,mjs,cjs,ts}',
      'packages/*/*.{js,mjs,cjs,ts}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
