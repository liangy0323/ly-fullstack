import { serviceBase } from '@/services/service-base';

import { API_APP_HEALTH } from './api';

import type { HealthStatus } from '@repo/shared/types';

/**
 * 获取管理 API 健康状态
 *
 * 工作台用它做真实的连通性检查；请求失败时不弹全局错误，由调用方渲染离线状态。
 *
 * @returns 管理 API 的健康检查结果
 */
export const getHealthStatus = (): Promise<HealthStatus> => {
  return serviceBase.get<HealthStatus>(API_APP_HEALTH, undefined, {
    requestOptions: { globalErrorMessage: false },
  });
};
