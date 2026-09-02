# LY Fullstack

简体中文 | [English](README.en.md)

[![CI](https://github.com/liangy0323/ly-fullstack/actions/workflows/ci.yml/badge.svg)](https://github.com/liangy0323/ly-fullstack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/badge/release-v0.1.0-087f5b.svg)](docs/releases/v0.1.0.md)

面向开源展示与真实项目的通用全栈解决方案。

📖 [官方使用文档](https://liangy0323.github.io/ly-fullstack/) · 本地运行 `pnpm docs:dev`

当前已经完成管理后台基础闭环：登录认证、动态菜单、用户/角色/菜单/字典/公共配置管理、五表 RBAC、数据库迁移与种子数据均已真实贯通；同时提供一个只包含健康检查、公共字典和公共配置读取能力的默认 C 端 API。后续阶段仍不会把尚未实现的具体终端业务算入现有范围。

## 核心思想

具体的 C 端业务无法被一套仓库提前定义：它可能是小程序、SSR 官网、单页应用、移动端，也可能是某个垂直场景的功能型产品。但无论 C 端产品采用什么形态，都需要与之配套的后台管理系统，并且登录认证、用户、角色、菜单、权限、工程规范等后台能力具有较高的通用性。

因此，LY Fullstack 先沉淀所有业务都可能复用的管理核心、标准的 Monorepo 工程模式，以及边界清晰的 Vue 3 管理后台目录组织方式：

- `apps/admin`：通用 Vue 3 管理后台，明确区分页面入口、业务组件、基础组件、请求层、状态、路由、导航和主题等职责边界。
- `apps/admin-api`：通用 NestJS 后台管理服务，以模块组织认证、RBAC 和系统管理能力。
- `apps/api`：默认 C 端 NestJS API，只提供健康检查、公共字典和公共配置读取，作为新增真实业务模块时的编码基线。
- `packages/*`：沉淀数据库、跨应用类型、纯工具和图表等可复用能力，避免应用之间复制代码或反向依赖。
- 根工程：使用 pnpm workspace、Turborepo、统一配置表和架构检查组织应用与共享包，提供标准的 Monorepo 开发、测试和构建流程。

项目不会在需求尚未明确时虚构 C 端页面或具体业务。默认 `apps/api` 只保留绝大多数 C 端都可能复用的健康检查、字典和公共配置读取能力，不包含终端用户认证，也不代表任何具体产品形态。开始真实项目后，可以直接在该服务中增加业务模块；需要独立服务时再执行 `pnpm new:server`。客户端仍应按真实需求选择 Nuxt、Next.js、Vue、React、小程序或其他技术栈。

针对已经明确的 C 端场景，项目可以进一步提供配套的业务 API 与客户端解决方案；这些方案建立在通用核心之上，但不会把某一种业务形态固化为核心仓库的默认答案。

## 适用范围与架构边界

LY Fullstack 当前采用以 NestJS 模块化单体为核心的工程架构，并通过 Monorepo 管理前端、管理服务、共享包和按需创建的独立业务应用。多个应用可以分别运行和部署，但这不等于微服务：项目目前没有提供 API 网关、服务注册与发现、配置中心、分布式链路追踪、分布式事务或完整的服务治理体系。

### 为什么默认不是微服务

微服务不是单体架构的“高级版本”，架构也不存在越复杂越专业。微服务解决的是服务需要独立部署与扩缩容、故障隔离以及多团队自治等特定问题，同时也会引入网络调用、数据一致性、消息幂等、链路追踪、部署编排和运维治理等额外成本。在这些需求尚未真实出现时提前拆分服务，通常只是用分布式系统的复杂度解决不存在的问题。

对于具备一定 Vue、TypeScript 或 Node.js 基础，正在系统进入全栈开发的开发者，以及个人项目、小型团队和大量中小型真实业务，优先掌握完整的前后端边界、数据库设计、登录认证、权限模型、测试和部署流程更有价值。LY Fullstack 选择模块化单体不是因为做不了微服务，而是希望先用更低的认知与运维成本，完成一套真实、规范、可维护并且足以覆盖大部分常见场景的全栈项目。

这套架构优先解决的是中小型真实项目中的开发效率、代码边界、后台通用能力和长期可维护性，适合以下场景：

- 个人开发者或小型团队承接的企业网站、小程序、内容平台和功能型 Web 产品。
- 初创产品、MVP 以及仍在验证业务模式的项目。
- 中小型组织的运营后台、内部管理系统及配套业务 API。
- 并发量、数据规模、可用性目标和外部系统集成复杂度仍可由单体应用与单一数据库合理承载的项目。

它不应被直接宣传为大型分布式系统底座，也不适合在未经额外设计的情况下直接承担以下场景：

- 超高并发、海量数据或强实时计算业务。
- 多地域容灾、严格高可用和复杂弹性伸缩要求。
- 大量独立团队并行交付、服务需要独立扩缩容和独立故障隔离的复杂系统。
- 需要复杂多租户隔离、分布式事务、消息驱动或严格行业合规的系统。

项目能否适用，不能只按公司规模判断。小型产品也可能具有极高流量，中型组织的内部系统也可能长期适合模块化单体。评估时应以峰值并发、数据增长、SLA、租户模型、部署环境、团队边界和发布频率为依据。

当业务规模增长时，应先通过数据库索引与连接池、缓存、任务队列、对象存储、限流、监控以及应用多实例部署解决明确瓶颈；只有在业务边界、团队边界和独立扩缩容需求真实出现后，再拆分服务并补充网关与服务治理能力。LY Fullstack 提供的是可持续演进的工程起点，不承诺用一套默认架构覆盖所有项目规模。

### 后续规划：微服务版本

下一阶段将规划独立的 NestJS 微服务解决方案，面向已经真实出现服务拆分、独立扩缩容、故障隔离和多团队协作需求的项目。该方案将重点覆盖 API 网关、服务间通信、消息可靠性、认证传播、配置管理、可观测性、容器化部署和分布式测试等能力。

微服务版本不会直接堆叠到当前仓库，也不会把 LY Fullstack 强行改造成微服务。两套方案将保持清晰边界：LY Fullstack 继续解决模块化单体与中小型项目的高效交付问题；微服务版本解决业务规模和组织复杂度已经需要分布式架构的问题。在独立方案正式发布前，这些内容只属于后续规划，不计入当前项目能力。

## 界面预览

管理后台提供完整的深浅主题。首次访问默认跟随操作系统颜色偏好，用户主动切换后保留明确选择；两套主题共用同一套设计语言与功能结构，并针对可读性、组件状态和数据可视化分别适配。

### 工作台

| 深色主题                                                       | 浅色主题                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| ![LY Fullstack 深色主题工作台](docs/images/dashboard-dark.png) | ![LY Fullstack 浅色主题工作台](docs/images/dashboard-light.png) |

### 登录页

| 深色主题                                                   | 浅色主题                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| ![LY Fullstack 深色主题登录页](docs/images/login-dark.png) | ![LY Fullstack 浅色主题登录页](docs/images/login-light.png) |

## 技术栈

| 领域     | 选型                                                                |
| -------- | ------------------------------------------------------------------- |
| 管理后台 | Rsbuild 2 + Vue 3 + TypeScript + Element Plus + SCSS                |
| 服务端   | NestJS 11 + Fastify；管理 API 与默认 C 端 API 独立运行              |
| 数据层   | `@repo/database` + PostgreSQL 17 + Prisma 7（driver adapter 模式）  |
| 共享包   | `@repo/shared`（跨应用类型与无 UI 框架通用工具）                    |
| 图表包   | `@repo/charts`（ECharts 按需注册、初始化与公共类型）                |
| 工程基线 | pnpm workspace + Turborepo + ESLint + Prettier + Husky + commitlint |
| 测试     | Rstest + Playwright                                                 |

## 快速开始

### 1. 环境准备

| 依赖           | 版本要求   | 获取方式                                                                                                 |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| Node.js        | >= 22.19   | [官方下载](https://nodejs.org/en/download)                                                               |
| pnpm           | >= 11 < 12 | Node 22 自带 Corepack，执行 `corepack enable` 即可；或参考 [pnpm 安装指南](https://pnpm.io/installation) |
| PostgreSQL     | 17.x       | [官方下载](https://www.postgresql.org/download/)，安装时记住 `postgres` 超级用户的密码                   |
| Docker（可选） | 任意稳定版 | 本机未安装 PostgreSQL 时，由仓库 `compose.yaml` 自动启动容器                                             |

几点说明：

- Node 与 pnpm 的精确版本由根目录 `packageManager` 与 `engines` 固定，开启 Corepack 后无需手动对齐版本。
- PostgreSQL 与 Docker 二选一即可：使用本机 PostgreSQL 时确保服务可以启动；未安装 PostgreSQL 时，`pnpm setup` 会通过 Docker Compose 启动项目容器。
- 建库、建表和初始数据全部由 `pnpm setup` 完成，不需要手工创建数据库或执行 SQL。
- 推荐安装 [pgAdmin](https://www.pgadmin.org/) 作为可视化客户端，方便随时查看表结构与种子数据；安装与使用教程请自行查阅官方文档，本文不展开。
- 图形化安装 PostgreSQL 时设置的 `postgres` 用户密码是下一步初始化的第一个输入项，忘记后重置成本较高，建议安装当下就记录妥当。

### 2. 安装依赖

```bash
pnpm install
```

安装过程会自动执行 `prisma generate` 生成数据库 Client 代码，但不会连接 PostgreSQL，也不会创建数据库、表结构或初始数据。

### 3. 初始化数据库与本地配置

在仓库根目录直接执行：

```bash
pnpm setup
```

脚本会依次询问四项内容，全部输入完成后才开始写入：

1. **PostgreSQL 密码**：本机 `postgres` 用户的密码，隐藏输入。
2. **数据库名称**：默认 `ly_fullstack`，直接回车即可；仅允许字母、数字和下划线。
3. **管理员初始密码**：首次创建 `admin` 账号使用的密码，8 至 64 位，隐藏输入。
4. **确认管理员密码**：再输入一遍，两次不一致会要求重输。

输入完成后，脚本会自动完成以下全部动作：

- 检测本机 `127.0.0.1:5432`：已有 PostgreSQL 服务则直接复用；未检测到服务且本机可用 Docker Compose 时，自动启动项目内的 PostgreSQL 17 容器。
- 幂等创建目标数据库，已存在则跳过，不会删除任何数据。
- 生成 `apps/admin-api/.env.development` 与 `apps/api/.env.development`；两个服务共享本地数据库连接，管理 API 额外包含随机 JWT 密钥，这两个文件均不进入 Git。
- 执行 Prisma migration，创建全部表结构。
- 写入 RBAC 种子数据：超级管理员角色、完整菜单权限树和 `admin` 账号；重复执行 Setup 不会覆盖已有账号密码。

CI 与自动化环境可跳过交互：`pnpm setup --non-interactive` 配合 `SETUP_DATABASE_PASSWORD`、`SETUP_DATABASE_NAME`、`SETUP_ADMIN_PASSWORD` 三个环境变量。环境文件的安全边界详见 [`docs/environment.md`](docs/environment.md)。

### 4. 启动应用

```bash
# 交互式选择：先多选服务端应用，再选前端应用
pnpm dev

# 或非交互启动
pnpm dev all              # 启动全部应用
pnpm dev api admin-api admin  # 启动指定组合
```

本地地址由根 [`workspace.config.json`](workspace.config.json) 统一维护：

- 管理后台：<http://localhost:8081>
- 管理 API 健康检查：<http://localhost:3000/api/health>
- 默认 C 端 API 健康检查：<http://localhost:3001/api/health>
- 公共字典示例：`GET http://localhost:3001/api/public/dictionaries/:code`
- 公共配置示例：`GET http://localhost:3001/api/public/configs/:key`

打开管理后台，使用账号 `admin` 加上 Setup 中设置的管理员密码登录。结束开发后执行 `pnpm dev:stop` 停止本仓库的全部开发进程。

## 新建服务

需要在默认 `apps/api` 之外增加独立业务服务时，在根目录执行：

```bash
pnpm new:server
```

生成器会询问服务名与本地端口，然后完成四件事：

1. 从 `scripts/templates/server` 创建仅含健康检查的 NestJS + Fastify 服务。
2. 使用 `@repo/<服务名>` 作为包名。
3. 将服务登记到 `workspace.config.json` 的 `apps.server`。
4. 安装依赖，并验证新服务的类型、测试与构建。

例如输入 `content-api` 与 `3002` 会创建 `apps/content-api`，之后它会自动出现在 `pnpm dev` 的服务列表中。模板不预置数据库、JWT 或业务模块；终端用户认证与管理端认证属于不同应用边界，应在真实需求出现后分别实现。

业务 API 面向的客户端不做技术栈限制：可以是小程序、Nuxt 或 Next.js 构建的 SSR 官网、Vue 或 React 单页应用、移动端，也可以是其他功能型网站。确定真实产品形态后再创建对应客户端；需要纳入本 Monorepo 时，将其登记到 `workspace.config.json` 的 `apps.web`。

## 常用命令

| 命令                      | 说明                                             |
| ------------------------- | ------------------------------------------------ |
| `pnpm setup`              | 校验前端端口，初始化数据库、种子数据与服务端配置 |
| `pnpm new:server`         | 生成并注册新的 NestJS + Fastify 服务             |
| `pnpm dev`                | 根据配置表交互选择服务端和前端应用               |
| `pnpm dev all`            | 非交互启动配置表中的全部应用                     |
| `pnpm dev:admin`          | 单独启动 admin                                   |
| `pnpm dev:admin-api`      | 单独启动 admin-api                               |
| `pnpm dev:api`            | 单独启动默认 C 端 API                            |
| `pnpm dev:stop`           | 停止本仓库遗留的开发进程                         |
| `pnpm typecheck`          | 全仓类型检查                                     |
| `pnpm check:architecture` | 检查跨包依赖、目录纯度和服务层依赖方向           |
| `pnpm lint`               | ESLint 检查（`lint:fix` 自动修复）               |
| `pnpm format`             | Prettier 格式化（`format:check` 仅检查）         |
| `pnpm test`               | 服务模板冒烟测试与全仓 Rstest 单元测试           |
| `pnpm test:e2e`           | 使用独立数据库启动三端并执行 Playwright 完整回归 |
| `pnpm test:e2e:ui`        | 在 Playwright UI 模式运行端到端测试              |
| `pnpm test:e2e:report`    | 打开上一次 Playwright HTML 报告                  |
| `pnpm build`              | 构建全部产物                                     |
| `pnpm docs:dev`           | 启动 Rspress 官方文档站                          |
| `pnpm docs:build`         | 构建文档站、页面 Markdown 与 `llms.txt`          |
| `pnpm check`              | 完整代码门禁并构建官方文档站                     |

## 目录结构

```text
ly-fullstack/
├── apps/
│   ├── admin/                 # 管理后台（Rsbuild + Vue 3 + Element Plus）
│   ├── admin-api/             # 管理 API（NestJS + Fastify）
│   └── api/                   # 默认 C 端 API（健康检查、公共字典和公共配置）
├── packages/
│   ├── charts/                # 无框架 ECharts 能力与公共类型
│   ├── database/              # Prisma Schema、迁移、生成 Client 与数据库类型
│   └── shared/                # 跨应用类型与无 UI 框架通用工具
├── scripts/
│   ├── templates/server/      # 可生成的 NestJS 服务底座
│   └── *.mjs                  # 启动、初始化、配置读取与模板测试脚本
├── docs/                      # 工程专题文档与实现真相源
├── tests/e2e/                 # Playwright 真实认证、RBAC 与业务闭环测试
├── website/                   # Rspress 官方使用文档站源码
├── .rules/                    # 开发规范
├── .github/workflows/ci.yml   # Pull Request 与 main 分支质量门禁
├── workspace.config.json      # 应用分类、路径、包名、本地端口与健康检查真相源
└── compose.yaml               # 本地 PostgreSQL 依赖
```

## 当前能力边界

已实现：

- 管理后台外壳：可折叠侧栏（含窄屏抽屉）、Header、工作台、404 页与设计 token 体系。
- 多主题：深浅主题、Element Plus Sass 变量覆盖、组件级主题适配与主题切换动画。
- 登录认证：真实账号密码登录、JWT 会话恢复、密码变更撤销旧 Token、登录接口限流、服务端一次性图片滑块验证、401 失效处理与路由守卫。
- 五表 RBAC：用户、角色、菜单、用户角色、角色菜单关系，默认 Admin 超级管理员拥有最高权限。
- 系统管理：用户、角色、菜单、字典和公共配置的真实分页、筛选、新增、编辑、状态控制、关联分配和保护规则。
- 动态导航：侧边栏消费登录会话返回的数据库菜单树，菜单图标通过 Lucide 白名单管理。
- 请求层：`AxiosFactory` + 独立服务实例 + 拦截器；Token、认证失效和 UI 反馈通过应用启动层注入。
- 管理 API：CORS 白名单、ValidationPipe、JWT Guard、权限 Guard、健康检查和系统管理 CRUD。
- 默认 C 端 API：独立 NestJS 应用，提供健康检查，以及免登录、按键精确读取的启用字典和非敏感公共配置接口。
- 数据库：Prisma Schema、migration、种子数据和默认管理员初始化流程。
- 服务扩展：配置驱动的开发启动器与经过真实生成验证的 NestJS 服务模板。
- 工程基线：workspace catalog、Turborepo、架构边界检查、ESLint、Prettier、Husky、commitlint、Rstest 与 GitHub Actions CI。

尚未实现：具体 C 端业务、终端用户认证和任何 C 端客户端。默认 `apps/api` 只是业务服务编码起点，不应被宣传成已经完成的终端产品。部署环境变量契约已经明确；当前 CI 只承担质量门禁，不能把尚未接入真实服务器的 CD 算作现有能力。

## 文档体系与 AI 协作

### `website/`：官方使用文档——"项目应该怎么用"

基于 Rspress 2 的任务式文档站，详细覆盖本地初始化、目录职责、模块化单体边界、Admin CRUD、菜单权限、默认 C 端 API、数据库迁移、服务生成、质量门禁和生产部署。执行 `pnpm docs:dev` 本地阅读，`pnpm docs:build` 会同时生成静态站、各页面 Markdown、`llms.txt` 与 `llms-full.txt`。

`website/` 不属于业务应用或共享包，不登记到 `workspace.config.json`，也不改变根 `docs/` 的专题文档语义。

### `.rules/`：开发规范——"代码应该怎么写"

按技术栈拆分的强制编码规范，共 13 份：后台 CRUD 范本与页面规范（`admin.md`）、Vue 组件结构与顺序（`vue3.md`）、TypeScript 类型原则（`typescript.md`）、注释风格（`comment-style.md`）、错误处理分层（`error-handling.md`）、请求层封装（`axios.md`）、状态管理（`pinia.md`）、样式（`style.md`）、命名与目录（`naming.md`、`directory.md`）、工程配置（`engineering.md`）和提交前自查（`code-review.md`）。

开始某类任务前先读对应文件，完整路由表维护在 [`AGENTS.md`](AGENTS.md) 第四节。这些规范不是建议：不符合规范的代码过不了 lint、架构检查和 CI 门禁。

### `docs/`：专题文档——"系统是怎么设计与运转的"

面向具体专题的实现说明，按需查阅：

| 文档                                                             | 内容                            |
| ---------------------------------------------------------------- | ------------------------------- |
| [`docs/environment.md`](docs/environment.md)                     | 环境变量职责边界与 Setup 行为   |
| [`docs/e2e-testing.md`](docs/e2e-testing.md)                     | Playwright 环境、命令与诊断体系 |
| [`docs/public-api.md`](docs/public-api.md)                       | 默认 C 端 API 的能力与安全边界  |
| [`docs/admin-theme.md`](docs/admin-theme.md)                     | 多主题与 Element Plus 定制方案  |
| [`docs/admin-design-system.md`](docs/admin-design-system.md)     | 设计系统与页面交付自查清单      |
| [`docs/admin-version-offline.md`](docs/admin-version-offline.md) | 版本检测与离线缓存              |
| [`docs/deployment.md`](docs/deployment.md)                       | 生产部署方案                    |
| [`docs/releases/`](docs/releases)                                | 各版本 Release Notes            |

仓库根目录另有 [`ROADMAP.md`](ROADMAP.md)（路线图）、[`CHANGELOG.md`](CHANGELOG.md)（变更记录）与 [`CONTRIBUTING.md`](CONTRIBUTING.md)（贡献流程）。

### 用 AI 编码工具保持同一套规范

这套文档体系天然面向 AI 协作设计，也是本项目希望“人写、AI 写、多人写”产出一致的原因：

1. **`AGENTS.md` 是 AI 的统一入口**。它是 AI 编码代理（Codex、Claude Code 等遵循 AGENTS.md 约定的工具）进入仓库时自动读取的工作区说明，内含编程思想、技术栈、硬性架构边界和 `.rules/` 的任务路由表。
2. **用 AI 时把仓库根目录作为工作区打开**。工具会自动加载 `AGENTS.md`，再按任务类型（页面 CRUD、服务端模块、样式、测试等）路由到 `.rules/` 对应文件，不需要在提示词里粘贴规范全文。
3. **规范由工具链兜底，不靠自觉**。无论人或 AI 产出的代码，都必须通过 `pnpm check`（架构检查 + typecheck + lint + format + 测试 + 构建与远端 CI）；跨包依赖方向、目录纯度等边界由 `scripts/check-architecture.mjs` 机器化校验。
4. **换工具不换规范**。`AGENTS.md` 与 `.rules/` 是纯 Markdown，不绑定任何 AI 产品；任何支持读取工作区说明的工具消费的都是同一套规范。

## 开源许可

项目基于 [MIT License](LICENSE) 开源。

LY Fullstack 项目组
