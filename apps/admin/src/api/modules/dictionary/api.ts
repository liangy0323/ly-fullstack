/**
 * 字典分页列表与新增接口
 */
export const API_ADMIN_DICTIONARIES = '/dictionaries';

/**
 * 获取字典编辑或删除接口地址
 *
 * @param id 字典主键
 * @returns 字典编辑或删除接口地址
 */
export const getAdminDictionaryApi = (id: number): string => `/dictionaries/${id}`;

/**
 * 获取指定字典的字典项列表与新增接口地址
 *
 * @param dictionaryId 字典主键
 * @returns 字典项列表与新增接口地址
 */
export const getAdminDictionaryItemsApi = (dictionaryId: number): string => `/dictionaries/${dictionaryId}/items`;

/**
 * 获取字典项编辑或删除接口地址
 *
 * @param dictionaryId 字典主键
 * @param itemId 字典项主键
 * @returns 字典项编辑或删除接口地址
 */
export const getAdminDictionaryItemApi = (dictionaryId: number, itemId: number): string =>
  `/dictionaries/${dictionaryId}/items/${itemId}`;
