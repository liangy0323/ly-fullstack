import { serviceBase } from '@/services/service-base';

import {
  API_ADMIN_DICTIONARIES,
  getAdminDictionaryApi,
  getAdminDictionaryItemApi,
  getAdminDictionaryItemsApi,
} from './api';

import type {
  AdminDictionaryItemListItem,
  AdminDictionaryItemQueryParams,
  AdminDictionaryListItem,
  AdminDictionaryQueryParams,
  CreateAdminDictionaryItemParams,
  CreateAdminDictionaryParams,
  PaginationResult,
  UpdateAdminDictionaryItemParams,
  UpdateAdminDictionaryParams,
} from '@repo/shared/types';

/**
 * 分页查询后台字典
 *
 * @param params 页码、每页数量、关键词和状态筛选条件
 * @returns 字典分页结果
 */
export const fetchAdminDictionaries = (
  params: AdminDictionaryQueryParams,
): Promise<PaginationResult<AdminDictionaryListItem>> => {
  return serviceBase.get<PaginationResult<AdminDictionaryListItem>, AdminDictionaryQueryParams>(
    API_ADMIN_DICTIONARIES,
    params,
  );
};

/**
 * 新增后台字典
 *
 * @param params 字典名称、编码、说明和状态
 * @returns 新增后的字典记录
 */
export const createAdminDictionary = (params: CreateAdminDictionaryParams): Promise<AdminDictionaryListItem> => {
  return serviceBase.post<AdminDictionaryListItem, CreateAdminDictionaryParams>(API_ADMIN_DICTIONARIES, params);
};

/**
 * 编辑字典基础信息
 *
 * @param id 字典主键
 * @param params 字典名称、说明和状态
 * @returns 更新后的字典记录
 */
export const updateAdminDictionary = (
  id: number,
  params: UpdateAdminDictionaryParams,
): Promise<AdminDictionaryListItem> => {
  return serviceBase.put<AdminDictionaryListItem, UpdateAdminDictionaryParams>(getAdminDictionaryApi(id), params);
};

/**
 * 删除指定后台字典
 *
 * @param id 字典主键
 */
export const deleteAdminDictionary = (id: number): Promise<void> => {
  return serviceBase.delete<void>(getAdminDictionaryApi(id));
};

/**
 * 分页查询指定字典下的字典项
 *
 * @param dictionaryId 字典主键
 * @param params 页码、每页数量、关键词和状态筛选条件
 * @returns 字典项分页结果
 */
export const fetchAdminDictionaryItems = (
  dictionaryId: number,
  params: AdminDictionaryItemQueryParams,
): Promise<PaginationResult<AdminDictionaryItemListItem>> => {
  return serviceBase.get<PaginationResult<AdminDictionaryItemListItem>, AdminDictionaryItemQueryParams>(
    getAdminDictionaryItemsApi(dictionaryId),
    params,
  );
};

/**
 * 在指定字典下新增字典项
 *
 * @param dictionaryId 字典主键
 * @param params 字典项标签、值、排序权重、说明和状态
 * @returns 新增后的字典项记录
 */
export const createAdminDictionaryItem = (
  dictionaryId: number,
  params: CreateAdminDictionaryItemParams,
): Promise<AdminDictionaryItemListItem> => {
  return serviceBase.post<AdminDictionaryItemListItem, CreateAdminDictionaryItemParams>(
    getAdminDictionaryItemsApi(dictionaryId),
    params,
  );
};

/**
 * 编辑指定字典项
 *
 * @param dictionaryId 字典主键
 * @param itemId 字典项主键
 * @param params 字典项标签、值、排序权重、说明和状态
 * @returns 更新后的字典项记录
 */
export const updateAdminDictionaryItem = (
  dictionaryId: number,
  itemId: number,
  params: UpdateAdminDictionaryItemParams,
): Promise<AdminDictionaryItemListItem> => {
  return serviceBase.put<AdminDictionaryItemListItem, UpdateAdminDictionaryItemParams>(
    getAdminDictionaryItemApi(dictionaryId, itemId),
    params,
  );
};

/**
 * 删除指定字典项
 *
 * @param dictionaryId 字典主键
 * @param itemId 字典项主键
 */
export const deleteAdminDictionaryItem = (dictionaryId: number, itemId: number): Promise<void> => {
  return serviceBase.delete<void>(getAdminDictionaryItemApi(dictionaryId, itemId));
};
