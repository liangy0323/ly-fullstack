/**
 * 公共配置分页列表与新增接口
 */
export const API_ADMIN_PUBLIC_CONFIGS = '/public-configs';

/**
 * 获取公共配置编辑或删除接口地址
 *
 * @param id 公共配置主键
 * @returns 公共配置编辑或删除接口地址
 */
export const getAdminPublicConfigApi = (id: number): string => `/public-configs/${id}`;
