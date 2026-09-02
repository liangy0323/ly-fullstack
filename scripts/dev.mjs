/**
 * LY Fullstack 本地开发启动器
 *
 * 先多选后端服务，再多选前端应用。Turbo 负责任务编排，本脚本负责交互选择、端口预检、
 * 就绪检查、日志转发和进程生命周期。
 */

import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { get as getHttp } from 'node:http';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cancel, intro, isCancel, log, multiselect, outro } from '@clack/prompts';

import { getWorkspaceApplications, readWorkspaceConfig } from './workspace-config.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const packageJsonPath = resolve(repoRoot, 'package.json');
const logDir = resolve(repoRoot, '.log');
const outLogPath = resolve(logDir, 'dev-script.out.log');
const errLogPath = resolve(logDir, 'dev-script.err.log');
const workspaceConfig = readWorkspaceConfig(repoRoot);
const workspaceApplications = getWorkspaceApplications(workspaceConfig);

const DEFAULT_READY_TIMEOUT_MS = 60_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const SERVER_READY_TIMEOUT_MS = 120_000;
const LOCAL_NO_PROXY_HOSTS = ['localhost', '127.0.0.1', '::1'];
const LOCAL_NO_PROXY = [
  ...new Set(
    [process.env.NO_PROXY, process.env.no_proxy, ...LOCAL_NO_PROXY_HOSTS]
      .flatMap((value) => value?.split(',') ?? [])
      .map((value) => value.trim())
      .filter(Boolean),
  ),
].join(',');

const SERVICE_NAMES = workspaceApplications.filter((app) => app.kind === 'server').map((app) => app.name);
const FRONTEND_NAMES = workspaceApplications.filter((app) => app.kind === 'web').map((app) => app.name);
const APP_CONFIG = Object.fromEntries(
  workspaceApplications.map((app) => {
    const url = `http://localhost:${app.localPort}`;

    return [
      app.name,
      {
        ...app,
        port: app.localPort,
        url,
        ...(app.kind === 'server'
          ? {
              healthUrl: `http://127.0.0.1:${app.localPort}${app.healthPath}`,
              healthService: app.name,
              readyTimeoutMs: SERVER_READY_TIMEOUT_MS,
            }
          : { readyTimeoutMs: DEFAULT_READY_TIMEOUT_MS }),
      },
    ];
  }),
);

const paint = (open, close) => (text) => `\x1b[${open}m${text}\x1b[${close}m`;
const color = {
  bold: paint(1, 22),
  dim: paint(2, 22),
  cyan: paint(36, 39),
  green: paint(32, 39),
};
const ANSI_COLOR_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

const packageRequire = createRequire(packageJsonPath);
const turboPackagePath = packageRequire.resolve('turbo/package.json');
const turboPackage = JSON.parse(readFileSync(turboPackagePath, 'utf-8'));
const turboBinPath = resolve(dirname(turboPackagePath), turboPackage.bin.turbo);

/**
 * 定位当前 pnpm CLI
 *
 * Windows 无法在关闭 shell 时直接执行 pnpm.cmd，因此优先通过当前 Node.js 进程加载 pnpm 注入的 CLI。
 *
 * @returns Node.js 或 pnpm 可执行程序及其前置参数
 */
const resolvePnpmCommand = () => {
  if (process.env.npm_execpath) {
    return { args: [process.env.npm_execpath], command: process.execPath };
  }

  if (process.platform === 'win32') {
    const adjacentPnpmCliPath = resolve(dirname(process.execPath), 'node_modules/pnpm/bin/pnpm.mjs');
    if (!existsSync(adjacentPnpmCliPath)) {
      throw new Error('无法定位 pnpm CLI，请使用 pnpm dev 运行开发启动器。');
    }

    return { args: [adjacentPnpmCliPath], command: process.execPath };
  }

  return { args: [], command: 'pnpm' };
};

const activeChildren = new Map();
let outLogStream = null;
let errLogStream = null;
let shutdownPromise = null;
let shuttingDown = false;

for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error) => {
    if (error.code !== 'EPIPE') {
      process.exitCode = 1;
    }
  });
}

/**
 * 读取根包名称和版本，用于命令行标题。
 */
const readPackageMeta = () => {
  try {
    const { name, version } = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return { name: name ?? 'ly-fullstack', version: version ?? '0.0.0' };
  } catch {
    return { name: 'ly-fullstack', version: '0.0.0' };
  }
};

/**
 * 初始化本次启动日志。
 */
const prepareLogFiles = () => {
  mkdirSync(logDir, { recursive: true });
  writeFileSync(outLogPath, '');
  writeFileSync(errLogPath, '');
  outLogStream = createWriteStream(outLogPath, { flags: 'a' });
  errLogStream = createWriteStream(errLogPath, { flags: 'a' });
};

/**
 * 等待日志流写入完成，避免退出时截断最后一段错误信息。
 */
const closeLogFiles = async () => {
  const closeStream = (stream) => {
    return new Promise((resolvePromise) => {
      if (!stream || stream.closed) {
        resolvePromise();
        return;
      }

      stream.end(resolvePromise);
    });
  };

  await Promise.all([closeStream(outLogStream), closeStream(errLogStream)]);
  outLogStream = null;
  errLogStream = null;
};

/**
 * 恢复交互组件修改过的终端输入模式。
 */
const restoreTerminalInput = () => {
  if (!process.stdin.isTTY) {
    return;
  }

  if (process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }

  process.stdin.pause();
};

/**
 * 将 Turbo 输出同步写入终端、日志和异常摘要。
 */
const forwardOutput = (record, chunk, target, logStream) => {
  if (!target.destroyed && !target.writableEnded) {
    target.write(chunk);
  }
  logStream?.write(chunk);

  const plainText = String(chunk).replaceAll('\r', '\n').replace(ANSI_COLOR_PATTERN, '');
  record.outputTail = `${record.outputTail}${plainText}`.slice(-6_000);
};

/**
 * 启动一组由 Turbo 编排的持续开发任务。
 */
const spawnTurboDev = (appName) => {
  const app = APP_CONFIG[appName];
  const args = [turboBinPath, 'run', 'dev', `--filter=${app.packageName}`, '--env-mode=loose', '--ui=stream'];
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      NO_PROXY: LOCAL_NO_PROXY,
      PORT: String(app.port),
      no_proxy: LOCAL_NO_PROXY,
    },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let resolveExit;
  const record = {
    label: appName,
    child,
    outputTail: '',
    exitResult: null,
    exitPromise: new Promise((resolvePromise) => {
      resolveExit = resolvePromise;
    }),
  };

  activeChildren.set(appName, record);
  child.stdout?.on('data', (chunk) => forwardOutput(record, chunk, process.stdout, outLogStream));
  child.stderr?.on('data', (chunk) => forwardOutput(record, chunk, process.stderr, errLogStream));

  const settleExit = (result) => {
    if (record.exitResult) {
      return;
    }

    record.exitResult = result;
    activeChildren.delete(appName);
    resolveExit(result);
  };

  child.once('error', (error) => settleExit({ code: 1, signal: null, error }));
  child.once('exit', (code, signal) => settleExit({ code, signal, error: null }));

  return record;
};

/**
 * 提取子进程最后几行有效输出。
 */
const formatOutputTail = (record, lineCount = 6) => {
  return record.outputTail
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-lineCount)
    .join('\n');
};

/**
 * 生成子进程异常退出说明。
 */
const formatChildExit = (record, result = record.exitResult) => {
  const reason = result?.error
    ? result.error.message
    : result?.signal
      ? `收到信号 ${result.signal}`
      : `退出码 ${result?.code ?? 1}`;
  const tail = formatOutputTail(record);

  return tail ? `${record.label} 启动失败：${reason}\n${tail}` : `${record.label} 启动失败：${reason}`;
};

const delay = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

/**
 * 执行一次性的 pnpm 工作区命令
 *
 * 数据库包必须在多个服务启动前统一构建一次，禁止让每个服务并行执行 Prisma Generate。
 *
 * @param args pnpm 子命令和参数
 */
const runPnpmCommand = (args) => {
  return new Promise((resolvePromise, rejectPromise) => {
    const pnpmCommand = resolvePnpmCommand();
    const child = spawn(pnpmCommand.command, [...pnpmCommand.args, ...args], {
      cwd: repoRoot,
      env: process.env,
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.once('error', rejectPromise);
    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`pnpm ${args.join(' ')} 执行失败，退出码 ${code ?? 1}。`));
    });
  });
};

/**
 * 在所有后端服务启动前生成 Prisma Client 并构建共享数据库包
 */
const prepareServerDependencies = async () => {
  log.info('正在准备共享数据库客户端...');
  await runPnpmCommand(['--filter', '@repo/database', 'build']);
  log.success('共享数据库客户端已就绪。');
};

/**
 * 直接请求本地 HTTP 服务，避免本机代理干扰健康检查。
 */
const requestLocalHttp = (url, timeoutMs) => {
  return new Promise((resolvePromise, rejectPromise) => {
    const request = getHttp(url, (response) => {
      const chunks = [];

      response.on('data', (chunk) => chunks.push(chunk));
      response.once('error', rejectPromise);
      response.once('end', () => {
        const status = response.statusCode ?? 0;
        const body = Buffer.concat(chunks).toString('utf-8');

        resolvePromise({
          ok: status >= 200 && status < 300,
          status,
          json: async () => JSON.parse(body),
        });
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`本地 HTTP 请求超过 ${timeoutMs}ms`));
    });
    request.once('error', rejectPromise);
  });
};

/**
 * 等待应用就绪；Turbo 提前退出时立即返回真实错误。
 */
const waitForHttpReady = async (record, app, validateResponse) => {
  const deadline = Date.now() + app.readyTimeoutMs;
  let lastFailure = '';

  while (Date.now() < deadline) {
    if (record.exitResult) {
      throw new Error(formatChildExit(record));
    }

    try {
      const remainingMs = Math.max(1, deadline - Date.now());
      const response = await requestLocalHttp(
        app.healthUrl ?? app.url,
        Math.min(DEFAULT_REQUEST_TIMEOUT_MS, remainingMs),
      );

      if (response.ok && (await validateResponse(response))) {
        return;
      }

      lastFailure = response.ok ? '响应内容未通过就绪校验' : `HTTP ${response.status}`;
    } catch (error) {
      if (record.exitResult) {
        throw new Error(formatChildExit(record), { cause: error });
      }

      lastFailure = error instanceof Error ? error.message : String(error);
    }

    const outcome = await Promise.race([
      delay(400).then(() => null),
      record.exitPromise.then((result) => ({ result })),
    ]);

    if (outcome) {
      throw new Error(formatChildExit(record, outcome.result));
    }
  }

  const failureDetail = lastFailure ? `；最后一次探活失败：${lastFailure}` : '';
  const outputTail = formatOutputTail(record);
  const outputDetail = outputTail ? `\n最后启动日志：\n${outputTail}` : '';
  throw new Error(`${record.label} 启动超时：${app.healthUrl ?? app.url}${failureDetail}${outputDetail}`);
};

/**
 * 检查端口是否可以监听。
 */
const canListen = (port) => {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.once('error', () => resolvePromise(false));
    server.once('listening', () => server.close(() => resolvePromise(true)));
    server.listen({ port, host: '0.0.0.0', exclusive: true });
  });
};

/**
 * 启动前报告端口冲突，不结束占用端口的无关程序。
 */
const assertPortsAvailable = async (appNames) => {
  const occupiedPorts = [];

  for (const name of appNames) {
    const { port } = APP_CONFIG[name];
    if (!(await canListen(port))) {
      occupiedPorts.push(port);
    }
  }

  if (occupiedPorts.length > 0) {
    throw new Error(`端口 ${occupiedPorts.join('、')} 已被占用，请先运行 pnpm dev:stop 或检查占用进程。`);
  }
};

/**
 * 清理其他终端遗留的 LY Fullstack 开发进程。
 */
const cleanupStaleDevProcesses = () => {
  if (process.platform !== 'win32') {
    return 0;
  }

  const command = `
$CurrentPid = ${process.pid}
$AppPaths = @(ConvertFrom-Json $env:LY_FULLSTACK_APP_PATHS)
$PackageNames = @(ConvertFrom-Json $env:LY_FULLSTACK_PACKAGE_NAMES)
$targets = Get-CimInstance Win32_Process | Where-Object {
  $CommandLine = $_.CommandLine
  $MatchesAppPath = $false
  $MatchesPackageName = $false
  foreach ($AppPath in $AppPaths) {
    if ($CommandLine -like "*$AppPath*") { $MatchesAppPath = $true; break }
  }
  foreach ($PackageName in $PackageNames) {
    if ($CommandLine -like "*$PackageName*") { $MatchesPackageName = $true; break }
  }
  $_.ProcessId -ne $CurrentPid -and
  $_.Name -in @('node.exe', 'cmd.exe', 'turbo.exe') -and (
    $MatchesAppPath -or $MatchesPackageName
  )
} | Select-Object -ExpandProperty ProcessId -Unique
foreach ($targetProcessId in $targets) {
  taskkill /pid $targetProcessId /t /f 2>$null | Out-Null
}
@($targets).Count
`;
  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      LY_FULLSTACK_APP_PATHS: JSON.stringify(workspaceApplications.map((app) => resolve(repoRoot, app.path))),
      LY_FULLSTACK_PACKAGE_NAMES: JSON.stringify(workspaceApplications.map((app) => app.packageName)),
    },
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
  const count = Number(result.stdout.trim());

  return Number.isFinite(count) ? count : 0;
};

const runHiddenCommand = (command, args) => {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      windowsHide: true,
    });
    child.once('error', () => resolvePromise());
    child.once('exit', () => resolvePromise());
  });
};

/**
 * 终止 Turbo 及其创建的完整子进程树。
 */
const stopProcessTree = async (record) => {
  if (record.exitResult || !record.child.pid) {
    return;
  }

  if (process.platform === 'win32') {
    await runHiddenCommand('taskkill', ['/pid', String(record.child.pid), '/t', '/f']);
  } else {
    try {
      process.kill(-record.child.pid, 'SIGTERM');
    } catch {
      // 子进程可能已经退出。
    }
  }

  await Promise.race([record.exitPromise, delay(3_000)]);
};

/**
 * 统一关闭全部开发进程并恢复终端。
 */
const shutdown = (exitCode = 0) => {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shuttingDown = true;
  shutdownPromise = (async () => {
    restoreTerminalInput();

    const records = [...activeChildren.values()];
    if (records.length > 0) {
      log.info('正在停止 LY Fullstack 开发应用...');
      await Promise.allSettled(records.map(stopProcessTree));
    }

    activeChildren.clear();
    await closeLogFiles();
    restoreTerminalInput();
    process.exitCode = exitCode;

    const exitTimer = setTimeout(() => process.exit(exitCode), 25);
    exitTimer.unref();
  })();

  return shutdownPromise;
};

/**
 * 注册操作系统退出信号。
 */
const bindShutdownSignals = () => {
  const onSignal = () => {
    if (!shuttingDown) {
      void shutdown(0);
    }
  };

  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  if (process.platform === 'win32') {
    process.once('SIGBREAK', onSignal);
  }
};

/**
 * 子进程异常退出时同步关闭其余应用。
 */
const monitorRunningProcess = (record) => {
  void record.exitPromise.then((result) => {
    if (shuttingDown) {
      return;
    }

    const message = formatChildExit(record, result);
    log.error(message);
    errLogStream?.write(`${message}\n`);
    void shutdown(result.code && result.code > 0 ? result.code : 1);
  });
};

/**
 * 解析非交互式目标，例如 pnpm dev api admin 或 pnpm dev all。
 */
const resolveCliSelection = (args) => {
  if (args.length === 0) {
    return null;
  }

  const availableNames = [...SERVICE_NAMES, ...FRONTEND_NAMES];
  const selectedNames = args.includes('all') ? availableNames : [...new Set(args)];
  const invalidNames = selectedNames.filter((name) => !availableNames.includes(name));

  if (invalidNames.length > 0) {
    throw new Error(`未知启动目标：${invalidNames.join('、')}。可选值为 ${availableNames.join('、')}、all。`);
  }

  return {
    services: selectedNames.filter((name) => SERVICE_NAMES.includes(name)),
    frontends: selectedNames.filter((name) => FRONTEND_NAMES.includes(name)),
  };
};

/**
 * 交互选择需要启动的后端服务。
 */
const pickServices = async () => {
  const selected = await multiselect({
    message: '选择需要启动的后端服务（可多选）',
    options: SERVICE_NAMES.map((name) => ({
      value: name,
      label: `${name.padEnd(9, ' ')} -> ${color.cyan(`localhost:${APP_CONFIG[name].port}`)}`,
    })),
    required: false,
  });

  return isCancel(selected) ? null : selected;
};

/**
 * 交互选择需要启动的前端应用。
 */
const pickFrontends = async () => {
  const selected = await multiselect({
    message: '选择需要启动的前端应用（可多选）',
    options: FRONTEND_NAMES.map((name) => ({
      value: name,
      label: `${name.padEnd(9, ' ')} -> ${color.cyan(`localhost:${APP_CONFIG[name].port}`)}`,
    })),
    required: false,
  });

  return isCancel(selected) ? null : selected;
};

/**
 * 完成两阶段交互选择并恢复终端输入模式。
 */
const pickApplications = async () => {
  try {
    const services = await pickServices();
    if (!services) {
      return null;
    }

    const frontends = await pickFrontends();
    if (!frontends) {
      return null;
    }

    return { services, frontends };
  } finally {
    restoreTerminalInput();
  }
};

/**
 * 启动并等待一组应用就绪。
 */
const startApplications = async (appNames) => {
  if (appNames.length === 0) {
    return;
  }

  log.info(`正在启动 ${appNames.map((name) => color.bold(name)).join('、')}`);

  const records = appNames.map((name) => ({ app: APP_CONFIG[name], name, record: spawnTurboDev(name) }));
  await Promise.all(
    records.map(async ({ app, name, record }) => {
      await waitForHttpReady(record, app, async (response) => {
        if (app.kind === 'server') {
          const health = await response.json();
          return health?.service === app.healthService;
        }

        return true;
      });
      log.success(`${color.green(`${name} 启动成功`)} ${color.dim(app.healthUrl ?? app.url)}`);
    }),
  );

  records.forEach(({ record }) => monitorRunningProcess(record));
};

/**
 * 输出命令行帮助。
 */
const printHelp = () => {
  process.stdout.write(`LY Fullstack 开发启动器\n\n`);
  process.stdout.write(`  pnpm dev                    交互选择后端服务和前端应用\n`);
  process.stdout.write(`  pnpm dev admin-api admin    非交互启动指定应用\n`);
  process.stdout.write(`  pnpm dev all                启动全部应用\n`);
  process.stdout.write(`  pnpm dev:stop               停止本仓库遗留开发进程\n`);
};

/**
 * 执行完整开发启动流程。
 */
const main = async () => {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  if (process.argv[2] === 'stop') {
    const cleanedCount = cleanupStaleDevProcesses();
    log.success(`已停止 ${cleanedCount} 个 LY Fullstack 开发进程。`);
    return;
  }

  prepareLogFiles();
  bindShutdownSignals();

  const { name, version } = readPackageMeta();
  intro(`${color.bold(name)} ${color.dim(`v${version}`)}`);

  const cliSelection = resolveCliSelection(process.argv.slice(2));
  const selection = cliSelection ?? (await pickApplications());
  if (!selection) {
    cancel('已取消启动。');
    await shutdown(0);
    return;
  }

  const { services, frontends } = selection;
  if (services.length === 0 && frontends.length === 0) {
    cancel('未选择任何应用。');
    await shutdown(0);
    return;
  }

  await assertPortsAvailable([...services, ...frontends]);
  if (services.length > 0) {
    await prepareServerDependencies();
  }
  await startApplications(services);
  await startApplications(frontends);
  outro(color.dim('全部所选应用已就绪，按 Ctrl+C 停止。'));
};

void main().catch(async (error) => {
  if (shuttingDown) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  log.error(message);
  errLogStream?.write(`${message}\n`);
  await shutdown(1);
});
