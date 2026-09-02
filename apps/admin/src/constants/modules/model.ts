import type { DataFilterFieldConfig, SelectOption } from '@/types';
import type {
  AdminDictionaryFilterModel,
  AdminDictionaryFormModel,
  AdminDictionaryItemFilterModel,
  AdminDictionaryItemFormModel,
  AdminPublicConfigFilterModel,
  AdminPublicConfigFormModel,
  AdminRoleFilterModel,
  AdminRoleFormModel,
  AdminUserFilterModel,
  AdminUserFormModel,
} from '@/types';

/**
 * 管理后台分页组件允许选择的每页记录数
 */
export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * 角色启用状态筛选选项
 */
export const ADMIN_ROLE_STATUS_OPTIONS: SelectOption[] = [
  {
    label: '启用',
    value: 'ACTIVE',
  },
  {
    label: '停用',
    value: 'INACTIVE',
  },
];

/**
 * 角色列表默认筛选参数
 */
export const ADMIN_ROLE_FILTER_MODEL: AdminRoleFilterModel = {
  pageNum: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
};

/**
 * 角色列表筛选字段配置
 */
export const ADMIN_ROLE_FILTER_CONFIG: DataFilterFieldConfig[] = [
  {
    type: 'input',
    field: 'keyword',
    label: '关键词',
    placeholder: '角色名称或编码',
  },
  {
    type: 'select',
    field: 'status',
    label: '角色状态',
    placeholder: '全部状态',
    options: ADMIN_ROLE_STATUS_OPTIONS,
  },
];

/**
 * 角色新增表单默认值
 */
export const ADMIN_ROLE_FORM_MODEL: AdminRoleFormModel = {
  name: '',
  code: '',
  description: '',
  isActive: true,
};

export const ADMIN_DICTIONARY_FILTER_MODEL: AdminDictionaryFilterModel = {
  pageNum: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
};

export const ADMIN_DICTIONARY_FILTER_CONFIG: DataFilterFieldConfig[] = [
  {
    type: 'input',
    field: 'keyword',
    label: '关键词',
    placeholder: '字典名称或编码',
  },
  {
    type: 'select',
    field: 'status',
    label: '字典状态',
    placeholder: '全部状态',
    options: ADMIN_ROLE_STATUS_OPTIONS,
  },
];

export const ADMIN_DICTIONARY_FORM_MODEL: AdminDictionaryFormModel = {
  code: '',
  name: '',
  description: '',
  isActive: true,
};

export const ADMIN_DICTIONARY_ITEM_FILTER_MODEL: AdminDictionaryItemFilterModel = {
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: undefined,
};

export const ADMIN_DICTIONARY_ITEM_FORM_MODEL: AdminDictionaryItemFormModel = {
  label: '',
  value: '',
  description: '',
  sortOrder: 0,
  isActive: true,
};

export const ADMIN_PUBLIC_CONFIG_FILTER_MODEL: AdminPublicConfigFilterModel = {
  pageNum: 1,
  pageSize: 20,
  keyword: '',
};

export const ADMIN_PUBLIC_CONFIG_FILTER_CONFIG: DataFilterFieldConfig[] = [
  {
    type: 'input',
    field: 'keyword',
    label: '关键词',
    placeholder: '配置键或说明',
  },
];

export const ADMIN_PUBLIC_CONFIG_FORM_MODEL: AdminPublicConfigFormModel = {
  key: '',
  value: '',
  description: '',
};

/**
 * 用户启用状态筛选选项
 */
export const ADMIN_USER_STATUS_OPTIONS: SelectOption[] = [
  {
    label: '启用',
    value: 'ACTIVE',
  },
  {
    label: '停用',
    value: 'INACTIVE',
  },
];

/**
 * 用户列表默认筛选参数
 */
export const ADMIN_USER_FILTER_MODEL: AdminUserFilterModel = {
  pageNum: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
  roleId: undefined,
};

/**
 * 用户列表固定筛选字段配置
 *
 * 角色选项由用户管理页面加载后追加，避免常量层依赖请求层。
 */
export const ADMIN_USER_FILTER_CONFIG: DataFilterFieldConfig[] = [
  {
    type: 'input',
    field: 'keyword',
    label: '关键词',
    placeholder: '登录名或显示名称',
  },
  {
    type: 'select',
    field: 'status',
    label: '用户状态',
    placeholder: '全部状态',
    options: ADMIN_USER_STATUS_OPTIONS,
  },
];

/**
 * 用户新增表单默认值
 */
export const ADMIN_USER_FORM_MODEL: AdminUserFormModel = {
  username: '',
  password: '',
  displayName: '',
  isActive: true,
};
