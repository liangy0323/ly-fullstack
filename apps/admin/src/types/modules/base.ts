import type { PaginationParams } from '@repo/shared/types';
import type { Ref } from 'vue';

/**
 * 管理后台支持的主题名称
 *
 * `dark` 表示深色主题，`light` 表示浅色主题。该类型同时约束根节点
 * `data-theme` 属性和全局主题变更事件，避免各模块使用不一致的字符串。
 */
export type ThemeName = 'dark' | 'light';

/**
 * 管理后台主题偏好
 *
 * `system` 表示跟随操作系统颜色偏好；用户主动切换后保存明确的深色或浅色偏好。
 */
export type ThemePreference = ThemeName | 'system';

/**
 * 后台弹窗表单支持的操作类型
 */
export type OperationType = 'add' | 'edit';

/**
 * 数据筛选面板支持的字段类型
 */
export type DataFilterFieldType = 'input' | 'select' | 'date' | 'daterange';

/**
 * 筛选控件能够提交的基础值
 */
export type DataFilterPrimitive = string | number;

/**
 * 筛选模型中的单个字段值
 *
 * 日期范围使用字符串数组；清空控件后使用 `null` 或 `undefined`，请求层应在提交前统一移除空值。
 */
export type DataFilterValue = DataFilterPrimitive | string[] | number[] | null | undefined;

/**
 * 页面持有的筛选模型
 */
export type DataFilterModel = Record<string, DataFilterValue>;

/**
 * Select 等选项型控件使用的通用选项
 *
 * @template TValue 提交给筛选模型和接口的实际值类型
 */
export interface SelectOption<TValue extends DataFilterPrimitive = DataFilterPrimitive> {
  /**
   * 选项展示文本
   */
  label: string;

  /**
   * 提交给筛选模型和接口的实际值
   */
  value: TValue;

  /**
   * 是否禁止选择当前选项
   */
  disabled?: boolean;
}

/**
 * 筛选字段共有配置
 */
interface DataFilterFieldBase {
  /**
   * 决定筛选面板渲染的控件类型
   */
  type: DataFilterFieldType;

  /**
   * 与页面筛选模型和接口查询参数对应的字段名
   */
  field: string;

  /**
   * 表单项左侧展示文本
   */
  label: string;

  /**
   * 控件为空时展示的输入提示
   */
  placeholder?: string;

  /**
   * 是否禁止操作当前筛选控件
   */
  disabled?: boolean;

  /**
   * 是否显示清空入口，默认开启
   */
  clearable?: boolean;
}

/**
 * 输入框筛选配置
 */
export interface DataFilterInputField extends DataFilterFieldBase {
  type: 'input';
}

/**
 * 下拉框筛选配置
 */
export interface DataFilterSelectField extends DataFilterFieldBase {
  type: 'select';

  /**
   * 页面直接提供的固定选项，适合状态、角色等枚举数据
   */
  options?: readonly SelectOption[];

  /**
   * 组件挂载后加载的通用远程选项
   *
   * 页面专属的分类、部门等选项应优先由页面加载后通过 `options` 传入，避免组件接管业务请求。
   */
  asyncOptions?: () => Promise<readonly SelectOption[]>;
}

/**
 * 单日期筛选配置
 */
export interface DataFilterDateField extends DataFilterFieldBase {
  type: 'date';

  /**
   * 日期在控件中的展示格式
   */
  format?: string;

  /**
   * 写入筛选模型并提交给接口的日期格式
   */
  valueFormat?: string;
}

/**
 * 日期范围筛选配置
 */
export interface DataFilterDateRangeField extends Omit<DataFilterFieldBase, 'placeholder'> {
  type: 'daterange';

  /**
   * 日期范围起始值的输入提示
   */
  startPlaceholder?: string;

  /**
   * 日期范围结束值的输入提示
   */
  endPlaceholder?: string;

  /**
   * 日期在控件中的展示格式
   */
  format?: string;

  /**
   * 写入筛选模型并提交给接口的日期格式
   */
  valueFormat?: string;
}

/**
 * 筛选面板支持的字段配置
 */
export type DataFilterFieldConfig =
  DataFilterInputField | DataFilterSelectField | DataFilterDateField | DataFilterDateRangeField;

/**
 * 分页 Composable 可以清理空值的筛选参数
 */
export type PaginationFilters = PaginationParams & DataFilterModel;

/**
 * 通用分页 Composable 初始化参数
 *
 * @template TFilters 当前页面的完整分页筛选模型
 */
export interface UsePaginationOptions<TFilters extends PaginationFilters> {
  /**
   * 页面首次加载和重置筛选时使用的完整查询参数
   */
  defaultFilters: TFilters;

  /**
   * 是否在页面挂载后立即请求列表，默认开启
   */
  immediate?: boolean;
}

/**
 * 数据筛选面板内部交互参数
 */
export interface UseDataFilterPanelOptions {
  /**
   * 页面通过 v-model 持有的筛选模型
   */
  model: Ref<DataFilterModel>;

  /**
   * 读取重置时需要恢复的默认筛选模型
   */
  getDefaultModel: () => DataFilterModel | undefined;

  /**
   * 读取当前字段配置，配置引用变化时重新加载异步选项
   */
  getConfig: () => readonly DataFilterFieldConfig[];

  /**
   * 通知页面按当前条件查询列表
   */
  onSearch: () => void;

  /**
   * 通知页面已完成筛选条件重置
   */
  onReset: () => void;
}
