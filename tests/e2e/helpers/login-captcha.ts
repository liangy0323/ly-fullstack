import type { Page } from '@playwright/test';

/**
 * E2E 测试环境下的图片挑战响应
 *
 * `testOffset` 只在 Playwright 专用 Admin API 启动命令中存在，生产构建和常规开发服务
 * 都不会返回该字段。
 */
interface E2eCaptchaChallenge {
  /**
   * 验证图片宽度
   */
  imageWidth: number;

  /**
   * 拼图块宽度
   */
  puzzleSize: number;

  /**
   * Playwright 专用的正确横向偏移
   */
  testOffset?: number;
}

/**
 * 打开登录图片验证弹框并完成一次真实指针拖动
 *
 * 测试仍经过页面交互、`/auth/captcha/verify` 服务端校验和一次性凭证流程，
 * 只使用测试启动命令追加的坐标代替人工观察图片。
 *
 * @param page 当前 Playwright 页面
 */
export const completeLoginCaptcha = async (page: Page): Promise<void> => {
  await page.setExtraHTTPHeaders({ 'x-ly-e2e-captcha': 'playwright' });
  const challengeResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/captcha') && response.request().method() === 'GET',
  );
  await page.getByRole('button', { name: '登录', exact: true }).click();

  const challengeResponse = await challengeResponsePromise;
  if (!challengeResponse.ok()) {
    throw new Error(`图片挑战创建失败：${challengeResponse.status()}`);
  }

  const challenge = (await challengeResponse.json()) as E2eCaptchaChallenge;
  if (typeof challenge.testOffset !== 'number') {
    throw new Error('Playwright Admin API 未返回测试专用拼图坐标。');
  }

  const slider = page.getByRole('slider', { name: '拖动滑块完成图片验证' });
  const track = page.getByTestId('login-captcha-track');
  await slider.waitFor({ state: 'visible' });

  const [sliderBox, trackBox] = await Promise.all([slider.boundingBox(), track.boundingBox()]);
  if (!sliderBox || !trackBox) {
    throw new Error('无法读取图片滑块轨道尺寸。');
  }

  const imageTravel = challenge.imageWidth - challenge.puzzleSize;
  const trackTravel = trackBox.width - sliderBox.width;
  const pointerStartX = sliderBox.x + sliderBox.width / 2;
  const pointerY = sliderBox.y + sliderBox.height / 2;
  const pointerEndX = pointerStartX + (challenge.testOffset / imageTravel) * trackTravel;
  const verifyResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/captcha/verify') && response.request().method() === 'POST',
  );

  await page.mouse.move(pointerStartX, pointerY);
  await page.mouse.down();
  await page.mouse.move(pointerEndX, pointerY, { steps: 12 });
  await page.mouse.up();

  const verifyResponse = await verifyResponsePromise;
  if (!verifyResponse.ok()) {
    throw new Error(`图片滑块服务端校验失败：${verifyResponse.status()}`);
  }
};
