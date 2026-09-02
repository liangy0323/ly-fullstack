---
title: 质量门禁
description: 解释架构检查、TypeScript、ESLint、Prettier、Rstest、构建、Rspress 文档构建、Playwright 与 GitHub Actions 的分工。
---

# 质量门禁

项目把“能运行”与“可以合并”分开。开发时先跑受影响范围，提交前执行完整门禁；数据库和浏览器关键链路由独立集成任务验证。

## 完整本地检查

```bash
pnpm check
```

当前顺序包括：

1. `pnpm check:architecture`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm format:check`
5. `pnpm test`
6. `pnpm build`
7. `pnpm docs:build`

脚本使用 `&&` 串联，任一步失败就返回非零退出码并停止。禁止吞掉失败码或只报告最后一步。

## 各检查解决什么问题

### 架构检查

```bash
pnpm check:architecture
```

检查应用与共享包依赖方向、服务端共享类型入口、目录纯度和配置约束。它不能替代业务评审，但能阻止常见越界进入主分支。

### 类型检查

```bash
pnpm typecheck
```

Turborepo 执行各 workspace 包类型检查，根脚本再检查 Playwright E2E TypeScript。类型通过不代表运行时数据库、浏览器交互或视觉正确。

### Lint 与格式

```bash
pnpm lint
pnpm format:check
```

ESLint 检查 Vue、TypeScript 和受限导入等规则；Prettier 只验证格式。需要自动修复时使用 `pnpm lint:fix` 和 `pnpm format`，再重新运行检查。

### 单元测试

```bash
pnpm test
```

先验证服务生成模板，再由 Turborepo 运行各包 Rstest。新增高风险业务规则时，应在 Service 或 composable 同目录补测试，而不是只依赖全仓已有用例。

### 生产构建

```bash
pnpm build
pnpm docs:build
```

业务构建验证 Admin、两个 API 和共享包产物；文档构建验证 Rspress 路由、Markdown、静态资源和 `llms.txt` 输出。

## 快速开发反馈

只修改一个模块时可以先运行：

```bash
pnpm --filter @repo/admin typecheck
pnpm --filter @repo/admin test
pnpm --filter @repo/admin-api test
pnpm --filter @repo/api build
```

这些命令用于缩短反馈时间，不替代最终 `pnpm check`。

## Playwright E2E

```bash
pnpm test:e2e
```

E2E 依赖已经完成 Setup 的 PostgreSQL、可用管理员账号和浏览器环境。它验证真实登录、菜单权限和关键页面流程，不包含在普通 `pnpm check` 中。

本地首次运行前需要准备独立测试数据库、`.env.e2e` 和 Chromium。完整步骤见 [Playwright 自动化测试](/operations/playwright)。

远程 CI 的集成 Job 会：

1. 启动 PostgreSQL 17 服务；
2. 非交互执行同一套 `pnpm setup`；
3. 运行 `pnpm verify:setup`；
4. 安装 Chromium；
5. 执行 Playwright 冒烟测试；
6. 上传测试报告。

## CI 分工

GitHub Actions 在 main 推送和 Pull Request 上运行：

- **Quality Gate**：安装锁定依赖并执行 `pnpm check`；
- **Setup & Playwright Smoke**：使用真实 PostgreSQL 和浏览器验证集成链路。

CI 通过表示仓库门禁通过，不代表已经部署到生产，更不代表真实域名、证书、备份和监控已经验收。

## 视觉和人工验收

自动检查无法证明：

- 深浅主题视觉都正确；
- 窄屏没有遮挡；
- 表单文案符合业务；
- 权限组合符合产品意图；
- 发布后的缓存头和 HTTPS 配置正确。

高风险页面仍需真实浏览器、真实角色和目标部署环境验收。
