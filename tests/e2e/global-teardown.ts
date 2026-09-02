import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';

import { getE2eEnvironment } from './helpers/environment';

/**
 * 删除包含管理员 Token 的临时 storageState
 */
const globalTeardown = async (): Promise<void> => {
  const environment = getE2eEnvironment();
  await rm(dirname(environment.authStatePath), { force: true, recursive: true });
};

export default globalTeardown;
