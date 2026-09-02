# 目录组织范式

本项目是 `ly-fullstack` 全栈 monorepo，使用 `apps/`、`packages/`、Turborepo 和 pnpm workspace 分包结构。

顶层结构：

```text
ly-fullstack/
├── apps/
│   ├── admin/      # 管理后台，Rsbuild + Vue 3 + Element Plus
│   ├── admin-api/  # 管理 API 服务，NestJS + Fastify
│   └── api/        # 默认 C 端 API，提供健康检查、公共字典和公共配置读取
├── packages/
│   ├── charts/     # 无框架 ECharts 能力与公共类型
│   ├── database/   # Prisma Schema、迁移、生成 Client 与数据库类型
│   └── shared/     # 前后端通用类型与无 UI 框架通用工具
├── scripts/
│   ├── templates/server/  # pnpm new:server 使用的服务模板
│   └── *.mjs              # 开发启动、环境初始化与模板测试脚本
├── workspace.config.json  # 应用注册表与本地运行配置
├── docs/
└── .rules/
```

本文件的目录规则适用于各子包内部组织；涉及根目录、workspace 编排和子包边界时，以当前 monorepo 结构为准。

## 通用模式：barrel 导出

模块化目录优先采用 `<domain>/index.ts` + `<domain>/modules/<feature>.ts`：

```text
<domain>/
├── index.ts
└── modules/
    ├── feature-a.ts
    └── feature-b.ts
```

适用于：`api/`、`constants/`、`types/`、`utils/`、`stores/`、`router/` 等普通模块目录。

例外：

- Vue 单文件组件目录不强制 barrel，按组件引用便利性决定。
- `composables/` 不使用 barrel 聚合，业务代码直接从具体 `use-*.ts` 文件导入。
- 框架自动扫描的入口目录是否使用 barrel，以对应框架的实际加载规则为准。
- 只有一个文件且短期没有扩展需求的目录，不为了形式拆 `modules/`。
- 构建脚本、测试配置、环境声明保持在仓库根目录或 `build/`、`tests/` 中。
- `services/` 不建立总 `index.ts`；API 模块显式导入具体服务实例，使多后端依赖保持可见。

---

## Shared 共享包边界

LY Fullstack 的跨端共享内容统一维护在 `packages/shared`，不为 HTTP 契约单独创建 package。

- `packages/shared/src/types`：使用 barrel 模式，`types/index.ts` 聚合 `types/modules/*.ts`，统一存放前后端或多个应用共同使用的请求参数、响应结构、分页协议、权限码和通用类型。
- `packages/shared/src/utils`：只收与 Vue、React 等 UI 框架无关的通用工具；可以包含供多个前端复用的浏览器工具，但 NestJS 服务禁止导入该入口。
- NestJS 服务只能从 `@repo/shared/types` 使用共享类型，不能从 `@repo/shared` 根入口或 `@repo/shared/utils` 导入，避免浏览器能力进入服务端依赖图。
- `packages/shared` 不维护 `AppEnv`、`ImportMetaEnv`、`ProcessEnv` 等单端环境变量类型；这些类型由各应用自己维护。
- `packages/shared/package.json` 同时暴露根入口、`./types` 与 `./utils`；开发阶段类型入口指向源码，不需要预先构建。
- 运行时入口指向 `dist` 中对应产物（CJS）；admin-api 生产构建通过 `tsconfig.build.json` 读取 `dist/types/index.d.ts`。
- 生产环境必须从仓库根目录执行 `pnpm build`，由 Turborepo 先生成 shared 运行时产物，再构建各应用。
- 不要通过单独构建某个应用来替代根构建发布流程，也不要把开发阶段的类型可见性绑定到旧的 `dist/index.d.ts`。

---

## Database 数据库包边界

- `packages/database/prisma`：唯一的 Schema、migration 与种子脚本目录。
- `packages/database/generated/prisma`：Prisma 自动生成源码，不提交仓库、不手动修改。
- `packages/database/src/index.ts`：服务端统一入口，只导出 Prisma Client 与数据库类型。
- database 不依赖 NestJS，不保存任何应用的连接串、JWT、Guard 或业务 Service。
- `apps/admin-api`、`apps/api` 与后续确实需要数据库的服务可以依赖 database；浏览器应用禁止依赖。
- 服务之间不得相互导入源码；需要跨服务共享的安全 HTTP 类型放 shared，需要共享的数据库定义放 database。

---

## Charts 图表包边界

- `packages/charts` 只维护 ECharts 按需注册、实例初始化和与注册能力一致的公共类型。
- 具体图表配置、业务数据转换、颜色语义、Vue 组件和页面交互放在消费应用内。
- 新增图表、组件或渲染能力时，必须同步扩展运行时注册、`ChartOption` 类型和测试。
- 调用方负责在组件卸载时销毁图表实例，禁止让 package 持有组件生命周期。

---

## Admin 标准结构

`apps/admin` 当前是管理后台 SPA，底座可以从最小结构开始，业务迁移时按下面结构逐步补齐：

```text
apps/admin/
├── build/                       # Rsbuild 配置与构建辅助方法
│   ├── rsbuild.base.config.ts
│   ├── rsbuild.dev.config.ts
│   ├── rsbuild.prod.config.ts
│   └── runtime/                 # 版本清单、运行时检测和离线缓存构建能力
├── docs/                        # 专题文档，例如鉴权、部署、接口说明
│   └── auth.md
├── public/                      # 不经构建处理的静态资源
├── tests/                       # Rstest 测试与 setup
├── src/
│   ├── main.ts                  # SPA 入口
│   ├── App.vue                  # 根组件
│   ├── bootstrap/               # 应用启动装配、全局事件和版本更新处理
│   ├── api/                     # API 层（barrel + modules）
│   │   └── modules/<domain>/
│   │       ├── api.ts           # URL 常量
│   │       └── interface.ts     # 请求函数
│   ├── assets/
│   │   ├── images/              # 源码托管图片
│   │   ├── fonts/               # 字体资源
│   │   ├── styles/              # 全局样式入口与模块
│   │   │   ├── index.scss
│   │   │   ├── mixins.scss
│   │   │   └── modules/
│   │   └── element-plus/        # Element Plus 样式覆盖（引入后使用）
│   ├── bridge/                  # 客户端/容器桥接能力
│   ├── chat/                    # IM SDK 初始化、消息适配、会话能力
│   ├── components/
│   │   ├── base/                # 通用基础组件
│   │   ├── business/            # 已被多个页面复用的跨页面业务组件
│   │   ├── overlay/             # 命令式覆盖层调用能力（barrel + modules）
│   │   └── <feature>/           # 按业务域分组的组件
│   ├── constants/               # 常量（barrel + modules）
│   ├── env/                     # 运行时环境读取与归一化
│   ├── feedback/                # 用户反馈能力（barrel + modules）
│   ├── composables/             # 跨页面组合式函数，不放页面 CRUD 业务逻辑
│   ├── layouts/                 # SPA 布局组件
│   ├── navigation/              # 导航领域能力（barrel + modules）
│   ├── plugins/                 # Vue 插件注册、第三方库装配
│   ├── router/                  # Vue Router（barrel + modules）
│   ├── services/                # HTTP/SDK 服务实例与拦截器
│   ├── stores/                  # Pinia 状态管理（barrel + modules）
│   ├── types/                   # 前端业务类型声明（barrel + modules）
│   ├── utils/                   # 纯工具函数（barrel + modules）
│   └── views/                   # 页面级路由组件
│       └── <feature>/
│           ├── index.vue
│           ├── components/      # 只服务当前页面的组件
│           └── composables/     # 当前页面的列表、表单和请求编排逻辑
├── env.d.ts                     # 环境变量与全局类型声明
├── rstest.config.ts             # 测试配置
└── tsconfig.json
```

## 未来主站边界

- 当前不创建 `apps/web` 空壳，也不提供 Web 生成器。
- 主站可能采用 Nuxt、Next.js 或其他 SSR/CSR 技术栈，目录规则应在技术选型确定后单独补充。
- 新主站手动创建后，登记到 `workspace.config.json` 的 `apps.web`，供根开发启动器发现。
- 无论选择什么框架，浏览器应用都不得直接依赖 `@repo/database` 或 Prisma 生成类型。

---

## 页面与路由

- `apps/admin` 是 SPA，页面统一放在 `src/views/`。
- Admin 路由模块统一放在 `src/router/modules/`。
- 菜单可以绑定的页面必须在静态路由 `meta.pageBinding` 中声明，Router `name` 与数据库 `routeName` 使用同一个稳定标识。
- `ADMIN_PAGE_OPTIONS` 只能由 Router 递归派生并通过 `@/router` 导出，禁止在 `constants/` 维护第二份页面注册表。
- 页面目录使用 kebab-case；Admin 页面入口统一命名为 `index.vue`。
- 页面私有组件放在页面目录下的 `components/`，不要提升到全局 `components/`。
- 只服务一个 CRUD 页面的 `use-xxx-management.ts` 放在页面的 `composables/`，禁止放入全局 `composables/`。
- 页面私有组件即使是弹窗、树或表单，也不能仅因为“它是组件”就进入 `components/business/`。
- `components/business/` 只接收已经被两个及以上页面真实复用、且边界稳定的业务组件。
- 禁止在 `components/business/` 下按页面复制 `dashboard/`、`menu/` 等私有模块，也不创建含义模糊的 `common/` 收容目录。
- 类型声明仍按 `.rules/typescript.md` 统一维护在 `src/types/modules/`；业务逻辑就近不意味着类型随文件散落。

```text
src/views/chat/
├── index.vue
├── index.scss
└── components/
    └── message-list.vue
```

系统管理页面的推荐结构：

```text
src/views/system/user/
├── index.vue
├── components/
    ├── user-form-dialog/
    ├── user-password-dialog/
    └── user-role-dialog/
└── composables/
    └── use-user-management.ts
```

## 通用目录边界

- `utils/` 只保存无业务语义、无 Vue/Element Plus/Router/Pinia 依赖的纯函数。
- 依赖 Element Plus 的消息提示放 `feedback/`，不能伪装成 `utils`。
- 菜单图标解析、导航树转换等应用导航逻辑放 `navigation/` 或布局私有 composable，不能放 `utils/`。
- `feedback/` 与 `navigation/` 使用 `index.ts + modules/`，外部只从目录入口导入，禁止绕过 barrel 访问内部实现。
- `components/base/` 只保存与具体页面、接口和业务状态无关的基础组件；单页视觉组件优先放页面附近。
- `services/` 不能直接依赖 UI、Router 或 Store，必须暴露注入协议并由 `bootstrap/` 在应用启动时装配。
- `bootstrap/` 是 Router、Pinia、服务适配器、版本更新监听和其他启动期全局副作用的装配入口；禁止重新创建根 `setup.ts`，`main.ts` 只创建、启动和挂载应用。

---

## API 层双文件模式

每个后端模块拆分为两个文件：

### `api.ts` — URL 常量

```ts
/**
 * 用户登录
 */
export const API_LOGIN = '/api/auth/login';

/**
 * 获取用户信息
 */
export const API_GET_USER_INFO = '/api/user/info';
```

### `interface.ts` — 请求函数

```ts
import { serviceCms } from '@/services/service-cms';

import * as API from './api';

import type { LoginParams, LoginResponse } from '@/types';

/**
 * 用户登录
 */
export const login = (params: LoginParams) => {
  return serviceCms.post<LoginResponse, LoginParams>(API.API_LOGIN, params);
};
```

---

## 资源放置

- 需要被构建处理、参与 hash 的资源放在 `src/assets/`。
- 需要保持原始文件名、通过绝对路径访问的资源放在 `public/`。
- 样式入口使用 `src/assets/styles/index.scss`，不要新增多个全局样式入口。
- 字体、图片、Element Plus 覆盖样式按 `assets/` 子目录归类。

---

## 复杂消息组件目录

`message-list-item` 这类复杂消息组件允许使用“共享结构组件 + 类型渲染器”的私有目录结构。

推荐结构：

```text
message-list-item/
├── index.vue
├── index.scss
├── components/
│   ├── message-row/
│   ├── message-avatar/
│   ├── message-quote/
│   └── message-notice/
└── renderers/
    ├── text-message/
    ├── file-message/
    ├── audio-message/
    ├── video-message/
    └── image-message/
```

约束：

- `components/` 放消息项内部共享结构组件，不绑定某一种 SDK 消息类型。
- `renderers/` 放具体消息正文渲染器，负责读取 payload 并输出正文内容。
- `notice` 是顶层居中提示分支，不进入普通消息渲染映射表。
- 普通消息渲染映射表默认保留在 `index.vue` 内部；静态映射不提前拆 `config` 文件。
- 只有映射逻辑依赖 Store、异步预取、复杂业务状态时，才拆 `composables/use-message-render-entry.ts`。
- 不为了目录完整提前创建空目录；新增真实类型或真实结构组件时再创建对应目录。

---

## 覆盖层调用组件

`src/components/overlay/` 用于收敛“调用时创建并挂载到 body”的命令式覆盖层能力，目录采用 barrel + modules：

```text
src/components/overlay/
├── index.ts
└── modules/
    └── image-preview.ts
```

约束：

- `overlay` 表示弹窗、预览、菜单这类覆盖在当前页面之上的 UI 行为，不表示 Vue `app.component()` 全局注册组件。
- `overlay/modules/*.ts` 只放命令式挂载、卸载和单例管理逻辑，不放具体 UI 模板。
- 具体弹窗、菜单、预览组件仍按 UI 归属放在 `components/dialog/*`、`components/context-menu/*` 等目录。
- 业务组件通过 `@/components/overlay` 调用覆盖层能力，不直接从具体 UI 组件目录导入 service。
- 这类能力应在调用时创建根节点并在关闭后卸载，避免 layout 常驻或每个业务组件实例持有隐藏弹窗。
