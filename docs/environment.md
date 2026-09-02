# 环境配置

环境配置先区分浏览器公开配置与服务端秘密配置，再决定是否进入仓库。当前提交以下文件：

- `apps/admin/.env.example`
- `apps/admin/.env.development`
- `apps/admin/.env.test`
- `apps/admin/.env.production`
- `apps/admin-api/.env.example`
- `apps/api/.env.example`

Admin 的环境变量会在构建后暴露给浏览器，本身不能承载密钥，因此 development、test 与 production 的开箱即用配置全部提交。`pnpm setup` 只校验 Admin development 中的 API 端口，不一致时根据应用注册表更新；Admin API 的 `.env.development` 包含数据库密码和本地 JWT 密钥，仍由 Setup 生成并忽略。

Admin API 的 `.env.test`、`.env.production` 与根 `.env` 始终忽略，由 CI/CD、容器或部署平台注入。前端文件可以提交不代表 `.env` 天然安全，判断标准是变量最终是否属于公开浏览器配置。

## 环境责任边界

| 应用      | 环境        | 配置载体                                       | 是否由 `pnpm setup` 生成 |
| --------- | ----------- | ---------------------------------------------- | ------------------------ |
| admin     | development | 仓库提交的 `.env.development`，Setup 校验端口  | 否                       |
| admin     | test        | 仓库提交的 `.env.test`                         | 否                       |
| admin     | production  | 仓库提交的 `.env.production`，部署可覆盖       | 否                       |
| admin-api | development | `.env.development`，包含本地数据库与密钥       | 是                       |
| admin-api | test        | CI 变量或本地私有 `.env.test`                  | 否                       |
| admin-api | production  | Secret、容器变量或服务器私有文件               | 否                       |
| api       | development | `.env.development`，包含本地数据库与 CORS 配置 | 是                       |
| api       | test        | CI 变量或本地私有 `.env.test`                  | 否                       |
| api       | production  | Secret、容器变量或服务器私有文件               | 否                       |

`.env.example` 声明环境变量契约。Admin 的三套文件都是可以直接运行的公开配置；Admin API 的运行环境文件不能提交。

## 本地开发

当前磁盘上没有 `apps/admin-api/.env.development` 或 `apps/api/.env.development` 时，说明尚未完成本地初始化。首次启动前在仓库根目录运行：

```bash
pnpm setup
```

初始化过程会：

1. 以隐藏输入方式收集本地 PostgreSQL 的 `postgres` 用户密码。
2. 询问数据库名称；直接回车使用 `ly_fullstack`，也可以填写其他名称。
3. 本机 `127.0.0.1:5432` 已有 PostgreSQL 时直接复用，否则把本次输入仅注入 Docker Compose 子进程并启动 PostgreSQL。
4. 幂等创建目标数据库。
5. 检查 `apps/admin/.env.development` 的 API 端口；一致时不改文件，不一致时按应用注册表更新。
6. 生成 `apps/admin-api/.env.development` 与 `apps/api/.env.development`；两者共享数据库连接，只有管理 API 包含 JWT 密钥。
7. 执行全部 Prisma migration 创建或更新表结构。
8. 要求输入并再次确认 8 到 64 位管理员初始密码，随后初始化 RBAC 数据与 `admin` 账号；重复执行不会重置已有账号密码。

再次执行时，只要 Admin API development 文件已经存在，脚本就会先请求确认，不会静默覆盖本地数据库连接和 JWT 密钥。Admin development 只有端口不一致时才会发生变化。

### 非交互初始化与 CI

Linux CI 使用和本地开发完全相同的 Setup 主流程，不维护一套只在流水线中生效的数据库初始化脚本。自动化环境通过进程变量提供数据库参数：

```bash
export SETUP_DATABASE_PASSWORD='<postgres 用户密码>'
export SETUP_DATABASE_NAME='ly_fullstack_ci'
export SETUP_ADMIN_PASSWORD='<管理员初始密码>'
pnpm run setup -- --non-interactive
```

`SETUP_DATABASE_NAME` 可以省略并使用 `ly_fullstack`；`SETUP_DATABASE_PASSWORD` 与 `SETUP_ADMIN_PASSWORD` 必须提供。密码不能放在命令行参数中，CI 应通过 Secret 或 Job 环境变量注入，避免出现在进程列表和命令日志。

非交互模式发现任一服务端 `.env.development` 时会直接失败，不会静默覆盖环境。CI 应始终使用干净检出；其他自动化环境需要重新初始化时，必须先明确删除旧文件。GitHub Actions 随后执行 `pnpm verify:setup`，真实查询默认管理员、超级管理员关系与菜单数据，确认 migration 和 seed 均已完成。

仓库提交的 Admin development 文件包含：

```dotenv
APP_ENV=development
API_BASE_URL=http://127.0.0.1:3000/api
```

Admin API 的 development 文件包含 `DATABASE_URL`、`CORS_ORIGINS`、随机生成的 `JWT_SECRET` 和 `JWT_EXPIRES_IN`。本地 `PORT` 不写入文件，由 `scripts/dev.mjs` 根据 `workspace.config.json` 注入，避免端口出现两个真相源。

## 测试环境

Admin 构建直接读取仓库中的 `.env.test`：

```dotenv
APP_ENV=test
API_BASE_URL=/api
```

普通服务端单元测试不需要为了形式创建环境文件。Playwright 端到端测试由根目录私有 `.env.e2e` 或 CI 注入以下变量：

```text
E2E_DATABASE_URL=<本机独立测试数据库连接串>
E2E_ADMIN_USERNAME=admin
E2E_ADMIN_PASSWORD=<测试数据库管理员密码>
```

测试启动器为两个 API 注入随机 JWT 密钥、CORS 来源和独立端口，并自动执行 migration/seed。数据库名称必须包含 `e2e`、`test` 或 `ci`，且只允许本机 PostgreSQL；详细命令与失败产物见 [`e2e-testing.md`](e2e-testing.md)。

## 生产环境与自动化部署

当前仓库已经通过 `.github/workflows/ci.yml` 在 main 推送与 Pull Request 上执行完整质量检查，但尚未配置自动部署。CD 仍需在确定 Docker、Kubernetes、云平台或 SSH + PM2 等真实目标后实现。

管理后台默认从已提交的 `.env.production` 读取：

```text
APP_ENV=production
API_BASE_URL=/api
```

部署到独立 API 域名时，可以由构建平台使用进程环境变量覆盖 `API_BASE_URL`。所有 Admin 变量都必须按“浏览器最终可见”审查，禁止写入 JWT 密钥或数据库凭据。

Admin API 在运行阶段需要：

```text
DATABASE_URL=<生产数据库连接串>
CORS_ORIGINS=<生产管理后台来源>
JWT_SECRET=<生产随机密钥>
JWT_EXPIRES_IN=7d
PORT=<生产服务端口>
```

`start:prod` 会设置 `APP_ENV=production`。NestJS 会优先使用部署平台注入的进程环境变量；应用目录中不存在 `.env.production` 也可以正常启动。缺少必填变量时应直接启动失败，不能回退到 development 或仓库根配置。

推荐部署方式按优先级排列：

1. 容器、Kubernetes 或云平台通过 Secret 和环境变量直接注入，不生成文件。
2. PM2、Systemd 等服务器部署由 CD 在目标服务器生成仅部署用户可读的 `.env.production`。
3. 禁止在 CI 工作区长期保存 Admin API 生产文件，禁止把服务端秘密打进前端静态产物或提交到 Git。

## Compose 与根目录环境文件

`pnpm setup` 启动 Compose 时，会把 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_PORT` 仅传给当前 Docker 子进程。脚本不会把这些值写入根 `.env`。

如需绕过 Setup 手动启动 Compose，必须先在当前终端显式设置 `POSTGRES_PASSWORD`。PowerShell 示例：

```powershell
$env:POSTGRES_PASSWORD = '<本地数据库密码>'
docker compose up -d postgres
```

日常仍应优先使用幂等的 `pnpm setup`，因为直接启动 PostgreSQL 容器不会执行 migration 和 seed。

## 环境变量契约

| 应用      | 变量             | 用途                                                       |
| --------- | ---------------- | ---------------------------------------------------------- |
| admin     | `APP_ENV`        | 当前构建环境，必须是 `development`、`test` 或 `production` |
| admin     | `API_BASE_URL`   | 管理 API 地址；本地指向注册端口，部署时通常使用同源 `/api` |
| admin-api | `DATABASE_URL`   | PostgreSQL 连接串                                          |
| admin-api | `CORS_ORIGINS`   | 允许访问管理 API 的浏览器来源，多个来源使用英文逗号分隔    |
| admin-api | `JWT_SECRET`     | 管理端 JWT 签名密钥                                        |
| admin-api | `JWT_EXPIRES_IN` | Access Token 有效期                                        |
| admin-api | `PORT`           | 本地由开发启动器注入，部署时由容器或平台注入               |
| api       | `DATABASE_URL`   | 与管理 API 共享的 PostgreSQL 连接串                        |
| api       | `CORS_ORIGINS`   | 允许访问公共 API 的真实 C 端浏览器来源                     |
| api       | `PORT`           | 本地由开发启动器注入，部署时由容器或平台注入               |

新增 Admin 变量时，必须确认它可以公开给浏览器，并同步更新 `.env.example`、`.env.development`、`.env.test`、`.env.production` 和本文档。新增 Admin API 变量时，只更新 `.env.example`、本地需要的 `scripts/setup.mjs`、CI/CD Secret 契约和本文档，绝不能提交真实运行值。

LY Fullstack 项目组
