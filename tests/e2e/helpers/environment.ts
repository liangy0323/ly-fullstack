import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

/**
 * Playwright 独立测试环境
 */
export interface E2eEnvironment {
  adminPort: number;
  adminApiPort: number;
  apiPort: number;
  adminUrl: string;
  adminApiUrl: string;
  apiUrl: string;
  databaseUrl: string;
  adminUsername: string;
  adminPassword: string;
  jwtSecret: string;
  authStatePath: string;
}

const DEVELOPMENT_PORTS = new Set([3000, 3001, 8081]);
const LOCAL_DATABASE_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])(e2e|test|ci)(?:[_-]|$)/i;

/**
 * 读取并校验测试端口
 *
 * @param name 环境变量名称
 * @param fallback 未配置时使用的独立测试端口
 * @returns 已通过范围和开发端口隔离校验的端口
 */
const getTestPort = (name: string, fallback: number): number => {
  const port = Number(process.env[name] || fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} 必须是 1 到 65535 之间的整数。`);
  }
  if (DEVELOPMENT_PORTS.has(port)) {
    throw new Error(`${name}=${port} 占用了项目开发端口，E2E 已拒绝启动。`);
  }
  return port;
};

/**
 * 校验测试数据库连接串
 *
 * 只允许本机 PostgreSQL，且数据库名称必须明确包含 e2e、test 或 ci。即使误传开发或生产连接串，
 * 数据库初始化也会在执行前被阻止。
 *
 * @param rawDatabaseUrl E2E_DATABASE_URL 原始值
 * @returns 标准化后的 PostgreSQL 连接串
 */
const validateDatabaseUrl = (rawDatabaseUrl: string | undefined): string => {
  if (!rawDatabaseUrl) {
    throw new Error('缺少 E2E_DATABASE_URL。请创建独立测试数据库，并通过 .env.e2e 或进程变量注入。');
  }

  const databaseUrl = new URL(rawDatabaseUrl);
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('E2E_DATABASE_URL 必须使用 PostgreSQL 协议。');
  }
  if (!LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname)) {
    throw new Error(`E2E 只允许连接本机测试数据库，当前主机为 ${databaseUrl.hostname}。`);
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`测试数据库名称必须明确包含 e2e、test 或 ci，当前名称为 ${databaseName || '<空>'}。`);
  }

  return databaseUrl.toString();
};

/**
 * 获取端到端测试唯一环境真相源
 *
 * 密码和数据库连接串必须由私有环境注入；用户名可以使用 seed 的公开默认账号。JWT 测试密钥在当前
 * Playwright 进程内随机生成，不写入仓库或报告。
 *
 * @returns 完整且已通过安全校验的测试环境
 */
export const getE2eEnvironment = (): E2eEnvironment => {
  if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error('生产环境禁止执行 Playwright destructive E2E。');
  }

  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('缺少 E2E_ADMIN_PASSWORD。测试密码必须通过 .env.e2e 或 CI Secret 注入。');
  }

  const adminPort = getTestPort('E2E_ADMIN_PORT', 18_081);
  const adminApiPort = getTestPort('E2E_ADMIN_API_PORT', 13_000);
  const apiPort = getTestPort('E2E_API_PORT', 13_001);
  if (new Set([adminPort, adminApiPort, apiPort]).size !== 3) {
    throw new Error('E2E_ADMIN_PORT、E2E_ADMIN_API_PORT 和 E2E_API_PORT 必须互不相同。');
  }

  return {
    adminPort,
    adminApiPort,
    apiPort,
    adminUrl: `http://127.0.0.1:${adminPort}`,
    adminApiUrl: `http://127.0.0.1:${adminApiPort}/api`,
    apiUrl: `http://127.0.0.1:${apiPort}/api`,
    databaseUrl: validateDatabaseUrl(process.env.E2E_DATABASE_URL),
    adminUsername: process.env.E2E_ADMIN_USERNAME || 'admin',
    adminPassword,
    jwtSecret: process.env.E2E_JWT_SECRET || randomBytes(48).toString('base64url'),
    authStatePath: resolve(process.cwd(), 'test-results/.auth/admin.json'),
  };
};
