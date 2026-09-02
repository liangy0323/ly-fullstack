import type {
  AdminDictionaryItemQueryParams,
  AdminDictionaryQueryParams,
  CreateAdminDictionaryItemParams,
  CreateAdminDictionaryParams,
} from '@repo/shared/types';

import type { DataFilterModel, OperationType } from './base';

/**
 * 字典管理页面的分页筛选模型
 *
 * 与 Shared 字典查询契约保持一致，并补充筛选面板需要的字符串索引能力。
 */
export type AdminDictionaryFilterModel = AdminDictionaryQueryParams & DataFilterModel;

/**
 * 字典项弹框的分页筛选模型
 *
 * 与 Shared 字典项查询契约保持一致，并补充筛选面板需要的字符串索引能力。
 */
export type AdminDictionaryItemFilterModel = AdminDictionaryItemQueryParams & DataFilterModel;

/**
 * 字典新增与编辑弹框使用的表单模型
 */
export interface AdminDictionaryFormModel extends Required<Omit<CreateAdminDictionaryParams, 'description'>> {
  /**
   * 字典用途说明；表单使用空字符串表示未填写
   */
  description: string;
}

/**
 * 字典项新增与编辑弹框使用的表单模型
 */
export interface AdminDictionaryItemFormModel extends Required<Omit<CreateAdminDictionaryItemParams, 'description'>> {
  /**
   * 字典项用途说明；表单使用空字符串表示未填写
   */
  description: string;
}

/**
 * 字典表单 Composable 的页面回调参数
 */
export interface UseDictionaryFormOptions {
  /**
   * 字典保存成功后的页面回调
   */
  onSuccess: (operationType: OperationType) => void;
}

/**
 * 字典项表单 Composable 的页面回调参数
 */
export interface UseDictionaryItemFormOptions {
  /**
   * 字典项保存成功后的页面回调
   */
  onSuccess: () => void;
}
