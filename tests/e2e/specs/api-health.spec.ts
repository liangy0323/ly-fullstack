import { expect, test } from '../fixtures/test';
import { getE2eEnvironment } from '../helpers/environment';

const environment = getE2eEnvironment();

test('服务健康与安全边界：两个 API 可用且登录接口执行真实限流', async ({ request }) => {
  await test.step('Admin API 和默认 API 健康检查均返回成功', async () => {
    const [adminHealth, publicHealth] = await Promise.all([
      request.get(`${environment.adminApiUrl}/health`),
      request.get(`${environment.apiUrl}/health`),
    ]);

    expect(adminHealth.ok()).toBe(true);
    expect(publicHealth.ok()).toBe(true);
    expect(adminHealth.headers()['x-content-type-options']).toBe('nosniff');
    expect(publicHealth.headers()['x-content-type-options']).toBe('nosniff');
  });

  await test.step('独立探测 IP 的高频登录请求在第六次被限流', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.24' };
    const username = `rate_limit_probe_${Date.now()}`;
    for (let requestIndex = 0; requestIndex < 5; requestIndex += 1) {
      const response = await request.post(`${environment.adminApiUrl}/auth/login`, {
        headers,
        data: { username, password: 'invalidPassword123' },
      });
      expect(response.status()).toBe(400);
    }

    const throttledResponse = await request.post(`${environment.adminApiUrl}/auth/login`, {
      headers,
      data: { username, password: 'invalidPassword123' },
    });
    expect(throttledResponse.status()).toBe(429);
  });
});
