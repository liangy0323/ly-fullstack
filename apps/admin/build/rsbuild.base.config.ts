import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';
import { resolve } from 'path';

import Components from 'unplugin-vue-components/rspack';
import AutoImport from 'unplugin-auto-import/rspack';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

import { loadAdminEnv } from './runtime/env';
import { buildOfflineIntegration } from './runtime/offline';
import { createVersionPlugin } from './runtime/version';

import type { RsbuildConfig } from '@rsbuild/core';

/**
 * 创建管理后台共享的 Rsbuild 配置
 *
 * 负责加载并校验环境变量、定义浏览器入口和产物路径、注入 Element Plus Sass 定制入口，
 * 同时注册版本检测、离线缓存、API 自动导入和基础组件自动导入能力。开发与生产配置在此基础上继续合并。
 *
 * @param envMode Rsbuild CLI 传入的环境文件模式，对应 `.env.development`、`.env.test` 或 `.env.production`
 * @returns 可与开发或生产差异配置合并的 Rsbuild 公共配置
 */
export const getBaseConfig = (envMode = 'development'): RsbuildConfig => {
  const env = loadAdminEnv(envMode);

  /**
   * 管理后台当前部署在站点根路径；调整部署子路径时必须同步影响静态资源、版本清单和 Worker 作用域。
   */
  const assetPrefix = '/';
  const isDev: boolean = env.appEnv === 'development' || process.env.PLAYWRIGHT_TEST === '1';

  /**
   * 版本清单和 Service Worker 使用的部署基础路径
   */
  const basePath = assetPrefix.endsWith('/') ? assetPrefix : `${assetPrefix}/`;

  /**
   * 离线缓存默认只在 test 和 production 构建启用，开发环境和 Playwright dev server 返回 null，
   * 避免 Worker 请求不存在的静态产物并干扰 HMR 或端到端诊断。
   */
  const offlineIntegration = isDev ? null : buildOfflineIntegration(env.appEnv, assetPrefix);

  /**
   * 构建运行时入口
   *
   * 非开发构建先注册版本轮询，再按离线配置注册 Service Worker；本地开发不请求不存在的构建产物。
   */
  const preEntry = [
    ...(isDev ? [] : [resolve(process.cwd(), './build/runtime/check.ts')]),
    ...(offlineIntegration?.preEntry ?? []),
  ];

  const config: RsbuildConfig = {
    /**
     * 浏览器入口与编译期变量
     *
     * 环境值经过 `loadAdminEnv` 校验后再序列化，业务源码无需直接读取 Node.js `process.env`。
     */
    source: {
      entry: {
        index: resolve(process.cwd(), './src/main.ts'),
      },
      preEntry,
      define: {
        'import.meta.env.APP_ENV': JSON.stringify(env.appEnv),
        'import.meta.env.API_BASE_URL': JSON.stringify(env.apiBaseUrl),
        __APP_VERSION_URL__: JSON.stringify(`${basePath}version.json`),
        __APP_VERSION_SW_SCOPE__: JSON.stringify(basePath),
        ...(offlineIntegration?.define ?? {}),
      },
    },

    /**
     * 构建产物目录与文件命名
     *
     * 开发环境使用稳定名称方便调试，部署产物使用内容 hash 支持长期缓存。
     */
    output: {
      assetPrefix,
      distPath: {
        root: resolve(process.cwd(), './dist'),
        css: 'css',
        cssAsync: 'css',
        js: 'js',
        jsAsync: 'js',
        font: 'font',
        image: 'images',
      },
      filenameHash: true,
      filename: {
        css: isDev ? '[name].css' : '[name]-[contenthash:8].css',
        js: isDev ? '[name].js' : '[name]-[contenthash:8].js',
        image: '[hash][ext][query]',
        font: '[name][ext]',
      },
    },

    /**
     * Admin 源码的模块解析规则
     */
    resolve: {
      extensions: ['.vue', '.ts', '.js', '.mjs'],
      alias: {
        '@': resolve(process.cwd(), './src'),
      },
    },

    /**
     * Vue、Sass、离线缓存和版本产物插件
     *
     * Sass additionalData 会把 Element Plus 变量与覆盖样式注入每个 SCSS 编译单元，
     * 业务样式不需要重复引入 `assets/element-plus/index.scss`。
     */
    plugins: [
      pluginVue(),
      pluginSass({
        sassLoaderOptions: {
          additionalData: `@use "@/assets/element-plus/index.scss" as *;`,
        },
      }),
      ...(offlineIntegration ? [offlineIntegration.plugin] : []),
      createVersionPlugin(env.appEnv),
    ],

    /**
     * Rspack 自动导入能力
     */
    tools: {
      rspack: {
        plugins: [
          /**
           * 自动导入 Vue、Vue Router、Pinia 的运行时 API，并按需解析 Element Plus API。
           * 生成的 `auto-imports.d.ts` 只由插件维护。
           */
          AutoImport({
            imports: ['vue', 'vue-router', 'pinia'],
            resolvers: [
              ElementPlusResolver({
                importStyle: 'sass',
              }),
            ],
            dts: resolve(process.cwd(), './auto-imports.d.ts'),
          }),

          /**
           * 自动扫描 `components/base` 基础组件，并按需解析 Element Plus 模板组件。
           * 其他业务组件目录不进入全局扫描，调用方必须显式导入。
           */
          Components({
            dirs: [resolve(process.cwd(), './src/components/base')],
            resolvers: [
              ElementPlusResolver({
                importStyle: 'sass',
              }),
            ],
            dts: resolve(process.cwd(), './components.d.ts'),
          }),
        ],
      },
    },

    /**
     * HTML 模板与默认标题
     */
    html: {
      template: resolve(process.cwd(), './index.html'),
      favicon: resolve(process.cwd(), './public/favicon.ico'),
      title: 'LY Fullstack Admin',
    },
  };

  return config;
};
