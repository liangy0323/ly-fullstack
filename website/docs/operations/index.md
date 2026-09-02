---
title: 部署运维总览
description: 从环境变量、质量检查、数据库迁移、静态资源、NestJS 进程、反向代理、验收、升级与回滚理解发布边界。
---

# 部署运维总览

LY Fullstack 已定义可执行的生产部署契约，但仓库当前只提供 CI 质量门禁，没有连接某台真实服务器的自动 CD。部署方式应根据你的云平台、容器环境或服务器运维方式落地。

## 生产拓扑

一个最小单机部署可以是：

```text
Internet
  │
  ├── admin.example.com ──► Nginx ──► Admin 静态文件
  │                                  └── /api/* ──► Admin API :3000
  │
  └── api.example.com ─────► Nginx ───────────────► API :3001

Admin API / API ──► PostgreSQL
```

管理 API 与默认 C 端 API 是两个独立进程。即使共享 PostgreSQL，也要使用独立端口、环境文件和进程管理单元。

## 一次发布的标准顺序

1. 从明确的 Tag 或 Commit 获取代码。
2. 使用锁文件安装依赖。
3. 执行 `pnpm check`。
4. 备份数据库并执行 `prisma migrate deploy`。
5. 仅在全新数据库执行一次 Seed。
6. 发布 Admin 静态产物并启动两个 API 进程。
7. 配置 HTTPS 与反向代理。
8. 检查健康接口和真实登录流程。
9. 保留上一份可运行版本，以便代码回滚。

任一步骤失败都应停止后续发布。不能在 migration 失败后仍切换代码，也不能只看进程“running”就宣布上线成功。

## 本节内容

- [环境变量](/operations/environment)：公开配置、秘密配置和各环境职责。
- [质量门禁](/operations/quality-gates)：本地检查、CI 和 E2E 的区别。
- [Playwright 自动化测试](/operations/playwright)：准备独立测试库，运行和调试真实浏览器回归。
- [生产部署](/operations/production)：从构建到 Nginx、验收与回滚。
- [常见问题](/operations/troubleshooting)：Setup、端口、CORS、Prisma、缓存和 404。
