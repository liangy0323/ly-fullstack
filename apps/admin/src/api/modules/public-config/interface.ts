import { serviceBase } from '@/services/service-base';

import { API_ADMIN_PUBLIC_CONFIGS, getAdminPublicConfigApi } from './api';

import type {
  AdminPublicConfigListItem,
  AdminPublicConfigQueryParams,
  CreateAdminPublicConfigParams,
  PaginationResult,
  UpdateAdminPublicConfigParams,
} from '@repo/shared/types';

/**
 * 分页查询后台公共配置
 *
 * @param params 页码、每页数量和关键词筛选条件
 * @returns 公共配置分页结果
 */
export const fetchAdminPublicConfigs = (
  params: AdminPublicConfigQueryParams,
): Promise<PaginationResult<AdminPublicConfigListItem>> => {
  return serviceBase.get<PaginationResult<AdminPublicConfigListItem>, AdminPublicConfigQueryParams>(
    API_ADMIN_PUBLIC_CONFIGS,
    params,
  );
};

/**
 * 新增后台公共配置
 *
 * @param params 配置键、配置值和说明
 * @returns 新增后的公共配置记录
 */
export const createAdminPublicConfig = (params: CreateAdminPublicConfigParams): Promise<AdminPublicConfigListItem> => {
  return serviceBase.post<AdminPublicConfigListItem, CreateAdminPublicConfigParams>(API_ADMIN_PUBLIC_CONFIGS, params);
};

/**
 * 编辑公共配置
 *
 * @param id 公共配置主键
 * @param params 配置值和说明
 * @returns 更新后的公共配置记录
 */
export const updateAdminPublicConfig = (
  id: number,
  params: UpdateAdminPublicConfigParams,
): Promise<AdminPublicConfigListItem> => {
  return serviceBase.put<AdminPublicConfigListItem, UpdateAdminPublicConfigParams>(getAdminPublicConfigApi(id), params);
};

/**
 * 删除后台公共配置
 *
 * @param id 公共配置主键
 */
export const deleteAdminPublicConfig = (id: number): Promise<void> => {
  return serviceBase.delete<void>(getAdminPublicConfigApi(id));
};
