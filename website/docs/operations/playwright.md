---
title: Playwright 自动化测试
description: 配置独立 PostgreSQL 测试库和 Playwright Chromium，运行、调试并排查 LY Fullstack 的登录、RBAC 与 CRUD 端到端测试。
---

# Playwright 自动化测试

Playwright 负责验证真实浏览器、Admin、Admin API、默认 API、PostgreSQL、Prisma migration/seed、JWT 与五表 RBAC 组成的关键业务闭环。纯函数、Service 分支和细粒度异常仍由 Rstest 单元测试覆盖，不在 E2E 中重复堆叠。

## 当前覆盖范围

- 后台认证：未登录拦截、错误密码、真实滑块验证码、正确登录、会话恢复、刷新与安全退出。
- 用户管理：表单校验、新增、搜索、编辑、重复用户名反馈、持久化与删除。
- 菜单管理：创建根目录、搜索、编辑与删除。
- 字典管理：维护字典和字典项，并通过默认 API 验证公开读取。
- 公共配置：新增、搜索、编辑、刷新持久化与默认 API 公开读取。
- RBAC：创建受限角色与用户、分配菜单、验证导航差异和无权限接口返回 `403`。
- 服务边界：两个 API 的健康检查、安全响应头与登录限流。

当前完整业务回归固定使用 Chromium 桌面端和单个 worker。测试共享同一个独立数据库，因此不会为了增加浏览器数量而复制同一套有状态业务用例。

## 运行前准备

### 安装 Chromium

首次运行或 Playwright 升级后安装浏览器：

```bash
pnpm exec playwright install chromium
```

Linux 或 CI 需要同时安装系统依赖：

```bash
pnpm exec playwright install --with-deps chromium
```

### 创建独立测试数据库

在本机 PostgreSQL 中创建专用数据库，名称必须包含独立片段 `e2e`、`test` 或 `ci`：

```sql
CREATE DATABASE ly_fullstack_e2e;
```

不要复用开发数据库，更不能填写生产数据库连接。E2E 会在启动浏览器前执行真实 migration 和幂等 seed。

### 配置 `.env.e2e`

将仓库根目录的 `.env.e2e.example` 复制为被 Git 忽略的 `.env.e2e`：

```dotenv
E2E_DATABASE_URL=postgresql://postgres:<本地密码>@127.0.0.1:5432/ly_fullstack_e2e?schema=public
E2E_ADMIN_USERNAME=admin
E2E_ADMIN_PASSWORD=<仅用于该测试库的密码>
```

`E2E_ADMIN_PASSWORD` 会在新测试库首次 seed 时设置管理员密码，后续运行不会覆盖已经存在的管理员。若数据库中已经存在 `admin`，环境变量必须与它的当前密码一致。

测试启动前会拒绝以下配置：

- `APP_ENV` 或 `NODE_ENV` 为 `production`。
- 数据库不是 PostgreSQL。
- 数据库主机不是 `127.0.0.1`、`localhost` 或 `::1`。
- 数据库名称不包含 `e2e`、`test` 或 `ci`。
- 测试端口与开发端口重复，或三个测试端口互相冲突。

## 运行测试

```bash
# 无头模式执行完整回归
pnpm test:e2e

# 打开 Playwright UI
pnpm test:e2e:ui

# 使用有头浏览器运行
pnpm test:e2e:headed

# 打开 Playwright Inspector
pnpm test:e2e:debug

# 查看上一次 HTML 报告
pnpm test:e2e:report
```

`pnpm test:e2e` 会依次完成：

1. 加载并校验 `.env.e2e`。
2. 对独立测试库执行 Prisma migration、生成 Client 和幂等 seed。
3. 使用独立端口启动 Admin API、默认 API 与 Admin。
4. 通过真实登录页生成管理员临时 `storageState`。
5. 使用 Chromium 单 worker 执行业务用例。
6. 关闭由 Playwright 启动的三个应用进程。

测试不会执行 destructive reset。每个业务用例使用唯一数据，并在 `finally` 中清理自己创建的记录，失败后可以重新运行。

## 测试端口

默认端口与日常开发完全隔离：

| 应用      | E2E 默认端口 | 开发端口 |
| --------- | -----------: | -------: |
| Admin     |      `18081` |   `8081` |
| Admin API |      `13000` |   `3000` |
| 默认 API  |      `13001` |   `3001` |

需要更换时在 `.env.e2e` 中设置：

```dotenv
E2E_ADMIN_PORT=18082
E2E_ADMIN_API_PORT=13002
E2E_API_PORT=13003
```

Playwright 固定 `reuseExistingServer: false`。如果目标端口已有进程，测试会停止并要求更换或释放端口，不会误连正在运行的开发服务。

## 报告与失败定位

HTML 报告写入 `playwright-report/`，截图、视频、Trace、临时认证状态与单测试附件写入 `test-results/`。两个目录均被 Git 忽略。

失败时建议按以下顺序定位：

1. 查看终端中的中文测试名、`test.step` 和首次失败断言。
2. 执行 `pnpm test:e2e:report` 查看 HTML 报告。
3. 检查失败截图、保留视频和“页面错误上下文”附件。
4. 使用 Trace 查看操作、网络请求、控制台和页面快照。

```bash
pnpm exec playwright show-trace "test-results/<失败用例目录>/trace.zip"
```

测试会收集未捕获 `pageerror`、真实 `console.error`、网络失败与 HTTP 5xx。普通业务 4xx 由相应用例显式断言，不会被当成页面崩溃。

## 常见问题

### 缺少环境变量

出现“缺少 `E2E_DATABASE_URL`”或“缺少 `E2E_ADMIN_PASSWORD`”时，确认仓库根目录存在 `.env.e2e`，并检查变量名是否与 `.env.e2e.example` 一致。不要把私有文件提交到 Git。

### seed 后仍无法登录

Seed 是幂等的，不会覆盖测试库中已有 `admin` 的密码。可以使用当前密码更新 `E2E_ADMIN_PASSWORD`，或者删除并重新创建独立测试数据库。

### webServer 启动超时

检查 `18081`、`13000`、`13001` 是否被占用，必要时通过 `E2E_*_PORT` 更换空闲端口。测试启动器会为回环地址配置 `NO_PROXY`；若企业安全软件仍拦截本机请求，需要允许 `127.0.0.1`、`localhost` 和 `::1`。

### CI 失败

GitHub Actions 会在独立 PostgreSQL 17 服务中执行 Setup、migration/seed 验证和 Playwright。失败时下载 `playwright-failure-artifacts`，先查看 HTML 报告，再结合截图、视频和 Trace 定位。失败产物保留 7 天。

## 与其他质量门禁的关系

`pnpm check` 包含 E2E TypeScript 类型检查，但不运行真实浏览器回归。涉及认证、权限、路由、数据库或关键页面交互的改动，在 `pnpm check` 之外还应执行：

```bash
pnpm test:e2e
```

更底层的测试实现与稳定性约束见仓库专题文档 [`docs/e2e-testing.md`](https://github.com/liangy0323/ly-fullstack/blob/main/docs/e2e-testing.md)。
