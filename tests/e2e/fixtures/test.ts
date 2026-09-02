import { expect, test as base } from '@playwright/test';

import type { ConsoleMessage, Page, Request, Response } from '@playwright/test';

interface PageDiagnostic {
  source: 'console' | 'pageerror' | 'requestfailed' | 'response';
  message: string;
  url?: string;
}

const IGNORED_REQUEST_FAILURES = new Set(['net::ERR_ABORTED']);
const EXPECTED_HTTP_ERROR_CONSOLE = /Failed to load resource: the server responded with a status of 4\d{2}/;

/**
 * 收集页面运行时错误和关键资源失败
 *
 * 普通 4xx 业务响应由具体用例断言；未捕获异常、console error、网络层失败和 5xx 会进入失败上下文，
 * 并在测试本身尚未失败时主动令用例失败，防止前端运行时错误被成功 DOM 断言掩盖。
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const diagnostics: PageDiagnostic[] = [];

    const handleConsole = (message: ConsoleMessage): void => {
      if (message.type() === 'error' && !EXPECTED_HTTP_ERROR_CONSOLE.test(message.text())) {
        diagnostics.push({ source: 'console', message: message.text(), url: message.location().url });
      }
    };
    const handlePageError = (error: Error): void => {
      diagnostics.push({ source: 'pageerror', message: error.stack || error.message, url: page.url() });
    };
    const handleRequestFailed = (request: Request): void => {
      const failure = request.failure()?.errorText || '未知网络错误';
      if (!IGNORED_REQUEST_FAILURES.has(failure)) {
        diagnostics.push({ source: 'requestfailed', message: failure, url: request.url() });
      }
    };
    const handleResponse = (response: Response): void => {
      if (response.status() >= 500) {
        diagnostics.push({ source: 'response', message: `HTTP ${response.status()}`, url: response.url() });
      }
    };

    page.on('console', handleConsole);
    page.on('pageerror', handlePageError);
    page.on('requestfailed', handleRequestFailed);
    page.on('response', handleResponse);

    await use(page);

    page.off('console', handleConsole);
    page.off('pageerror', handlePageError);
    page.off('requestfailed', handleRequestFailed);
    page.off('response', handleResponse);

    if (diagnostics.length || testInfo.status !== testInfo.expectedStatus) {
      const context = {
        title: testInfo.title,
        url: page.url(),
        diagnostics,
      };
      await testInfo.attach('页面错误上下文', {
        body: Buffer.from(JSON.stringify(context, null, 2)),
        contentType: 'application/json',
      });
    }

    if (testInfo.status === testInfo.expectedStatus) {
      expect(diagnostics, '页面不应出现未捕获异常、console error、网络层失败或 5xx').toEqual([]);
    }
  },
});

export { expect } from '@playwright/test';
