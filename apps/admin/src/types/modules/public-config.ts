import type { AdminPublicConfigQueryParams, CreateAdminPublicConfigParams } from '@repo/shared/types';

import type { DataFilterModel, OperationType } from './base';

/**
 * 公共配置管理页面的分页筛选模型
 *
 * 与 Shared 公共配置查询契约保持一致，并补充筛选面板需要的字符串索引能力。
 */
export type AdminPublicConfigFilterModel = AdminPublicConfigQueryParams & DataFilterModel;

/**
 * 公共配置新增与编辑弹框使用的表单模型
 */
export interface AdminPublicConfigFormModel extends Required<Omit<CreateAdminPublicConfigParams, 'description'>> {
  /**
   * 配置用途说明；表单使用空字符串表示未填写
   */
  description: string;
}

/**
 * 公共配置表单 Composable 的页面回调参数
 */
export interface UsePublicConfigFormOptions {
  /**
   * 公共配置保存成功后的页面回调
   */
  onSuccess: (operationType: OperationType) => void;
}
