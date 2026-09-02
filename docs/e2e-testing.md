# Playwright 端到端测试

Playwright 负责验证真实浏览器、Admin、Admin API、默认 API、PostgreSQL、Prisma migration/seed、JWT 与五表 RBAC 的关键业务闭环。纯函数、Service 分支和细粒度 HTTP 契约仍由 Rstest 承担，不在 E2E 中重复堆叠。

## 当前覆盖

- 后台认证：未登录跳转、错误密码、真实滑块验证码、正确登录、用户信息恢复、刷新会话、退出和路由保护。
- 用户管理：表单校验、创建、搜索、编辑、重复用户名的服务端失败反馈、刷新持久化与删除。
- 菜单管理：根目录创建、搜索、编辑和删除。
- 字典管理：字典与字典项创建、编辑、公开 API 读取和删除后不可读取。
- 公共配置：创建、搜索、编辑、刷新持久化、公开 API 读取和删除后不可读取。
- RBAC：创建受限角色和用户、分配菜单、不同角色的导航差异，以及无权限接口真实返回 `403`。
- 服务边界：Admin API 与默认 API 健康检查、安全响应头和登录限流。

完整后台回归固定运行 Chromium 桌面端。当前没有声明 Firefox、WebKit 的正式支持矩阵，而且用例共享同一个测试数据库；贸然把相同业务矩阵复制到三个浏览器只会增加 CI 时间和状态竞争。需要扩大浏览器范围时，应先完成数据分片，再增加独立的兼容性冒烟层。

## 1. 安装浏览器

首次运行或 Playwright 升级后安装 Chromium：

```bash
pnpm exec playwright install chromium
```

Linux CI 使用包含系统依赖的命令：

```bash
pnpm exec playwright install --with-deps chromium
```

## 2. 准备独立测试数据库

先在本机 PostgreSQL 中创建一个独立数据库，例如：

```sql
CREATE DATABASE ly_fullstack_e2e;
```

复制 [`.env.e2e.example`](../.env.e2e.example) 为被 Git 忽略的 `.env.e2e`，填写真实的本地连接和测试管理员密码：

```dotenv
E2E_DATABASE_URL=postgresql://postgres:<本地密码>@127.0.0.1:5432/ly_fullstack_e2e?schema=public
E2E_ADMIN_USERNAME=admin
E2E_ADMIN_PASSWORD=<仅用于该测试库的密码>
```

每次执行 `pnpm test:e2e` 都会在启动浏览器前自动运行 Prisma migration、生成 Client 并幂等 seed，不需要手工初始化。测试不执行 destructive reset；业务数据使用唯一名称，并在 `finally` 中严格清理，因此失败后可以安全重跑。

### 数据库安全边界

测试在执行任何 migration/seed 之前会校验：

- `APP_ENV` 和 `NODE_ENV` 不能是 `production`。
- 连接必须使用 PostgreSQL。
- 数据库主机只能是 `127.0.0.1`、`localhost` 或 `::1`。
- 数据库名必须以独立片段包含 `e2e`、`test` 或 `ci`。

任一条件不满足都会立即失败。不要把开发库改名伪装成测试库，也不要在 `.env.e2e` 中保存生产连接。

## 3. 运行命令

```bash
# 无头完整回归
pnpm test:e2e

# Playwright UI 模式
pnpm test:e2e:ui

# 有头浏览器
pnpm test:e2e:headed

# Playwright Inspector 调试
pnpm test:e2e:debug

# 打开上一次 HTML 报告
pnpm test:e2e:report
```

如需临时使用其他私有环境文件，可设置 `E2E_ENV_FILE`。三个测试端口也可在环境文件中覆盖，默认分别是 Admin `18081`、Admin API `13000`、API `13001`。配置会拒绝项目开发端口 `8081`、`3000`、`3001`，并拒绝三个测试端口互相重复。

## 4. 报告与失败定位

HTML 报告写入 `playwright-report/`，单测试产物写入 `test-results/`。两者和临时 `storageState` 均被 Git 忽略。失败时可以获得：

- 中文业务测试名与 `test.step`、耗时和失败步骤。
- 失败页面截图与保留的视频。
- 本地失败 Trace；CI 在首次重试时记录 Trace。
- Playwright 页面快照和额外的“页面错误上下文”附件。
- 未捕获 `pageerror`、真实 console error、网络失败和 HTTP 5xx。

查看单个 Trace：

```bash
pnpm exec playwright show-trace "test-results/<失败用例目录>/trace.zip"
```

普通业务 4xx 由对应测试显式断言，不会被误判成页面崩溃；未捕获异常、资源加载失败和服务端 5xx 不会被静默忽略。

## 5. 稳定性约束

- 全局 setup 只通过真实登录页生成一次管理员 `storageState`，非认证用例复用该状态；完整登录与受限角色登录仍独立验证。
- 共享数据库期间固定 `workers: 1`，测试不依赖声明顺序，每个业务用例生成唯一数据。
- 不使用固定延时、`networkidle`、脆弱的 CSS 层级或重试掩盖竞态。
- 测试结束后由 Playwright 关闭三个 `webServer`；`reuseExistingServer` 固定为 `false`，避免误连开发进程。
- 本地不重试，CI 最多重试一次并保留诊断产物。

## 6. 常见问题

### 缺少 E2E_DATABASE_URL 或 E2E_ADMIN_PASSWORD

确认仓库根目录存在私有 `.env.e2e`，变量名与示例一致。不要把该文件提交到 Git。

### seed 后仍无法登录

seed 是幂等的，不会覆盖测试库中既有 `admin` 的密码。删除并重新创建独立测试数据库，或使用它当前的密码更新 `E2E_ADMIN_PASSWORD`。

### webServer 启动超时或端口被占用

检查 `18081`、`13000`、`13001`，或通过 `E2E_*_PORT` 选择空闲的非开发端口。Playwright 不会复用已存在的进程。

### 本机配置了 HTTP 代理

测试启动器会为 `127.0.0.1`、`localhost`、`::1` 设置 `NO_PROXY`，避免本地健康检查被代理转发。若企业安全软件仍拦截回环流量，需要在软件中允许这三个测试服务。

### CI 失败

下载该次任务的 `playwright-failure-artifacts`，先打开 HTML 报告，再从失败用例进入截图、视频和 Trace。CI 仅在失败时上传，保留 7 天，以控制公开仓库的存储成本。

LY Fullstack 项目组
