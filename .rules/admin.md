# Admin 模块规范

`apps/admin` 是基于 Rsbuild、Vue 3 和 Element Plus 的管理后台 SPA。通用 Vue、TypeScript、样式与工程规范仍以 `.rules/` 下对应文件为准；本文只记录 admin 模块的目录、自动导入、Element Plus 覆盖样式和 CRUD 范本约定。

开发或调整 Admin 页面视觉前，必须同时阅读 `docs/admin-design-system.md`。该文档记录当前项目已经落地的视觉语言、页面模板和交付自查清单；外部设计只能提供局部启发，不得覆盖项目既有设计系统。

## 目录边界

- `src/components/base/`：基础组件，可被自动扫描导入。
- `src/components/business/`：跨页面业务组件，必须显式导入。
- `src/views/<module>/index.vue`：页面入口，只负责页面结构和交互编排；私有组件与逻辑继续保留在页面目录。
- `src/views/<module>/components/`：只服务当前页面的组件，不提升到 `components/business/`。
- `src/views/<module>/composables/`：当前页面的组合式逻辑，不设置 barrel。
- `src/composables/use-*.ts`：后台多页面复用的组合式逻辑，不设置 barrel。
- `src/constants/modules/model.ts`：后台筛选配置、默认筛选值、表单默认值。
- `src/router/modules/`：静态路由与页面绑定元数据的唯一真相源；菜单选择项由 Router 派生，禁止复制到 constants。
- `src/types/modules/base.ts`：后台基础类型，例如 `OperationType`、筛选字段类型、通用选项类型。

## 自动导入

AutoImport 当前覆盖 Vue、Vue Router、Pinia 和 Element Plus resolver 支持的 API。业务代码可以直接使用生成声明中已有的运行时 API，但以下内容必须显式导入：

- `auto-imports.d.ts` 已声明的 Vue、Vue Router 和 Pinia 运行时 API 禁止再次显式导入。

- 所有类型声明。
- `src/components/business/` 组件。
- `src/components/layouts/` 组件。
- `src/layouts/` 路由布局。
- 本地 composables、utils、constants、services。

禁止为了省 import 把 `unplugin-vue-components` 的扫描目录扩大到整个 `src/components`。

### Element Plus 唯一样式入口

Element Plus 组件和运行时 API 必须统一交给 `unplugin-vue-components`、`unplugin-auto-import` 与
`ElementPlusResolver({ importStyle: 'sass' })` 处理。业务源码不得自行选择 Element Plus 样式入口，
否则预编译 CSS 会绕过 `src/assets/element-plus/modules/var.scss`，重新注入默认主题变量。

强制规则：

- Vue 模板中的 `el-*` 组件禁止从 `element-plus` 或 `element-plus/es` 手动导入；
- `ElMessage`、`ElMessageBox`、`ElNotification`、`ElLoading` 等运行时 API 禁止手动导入，直接使用自动导入名称；
- 禁止在 `apps/admin/src` 的 TS、Vue 和业务 SCSS 中导入 `*/style/css`、`*/style/index`、
  `element-plus/theme-chalk/*.css` 或其他 Element Plus 预编译样式；
- Element Plus 类型只能使用 `import type` 显式导入；语言包等 Resolver 不负责的非组件资源可以显式导入；
- Element Plus Sass 定制唯一入口是 `src/assets/element-plus/index.scss`，编译变量统一维护在
  `src/assets/element-plus/modules/var.scss`；
- 自动导入声明缺失时，先确认 Rsbuild 插件配置并执行 Admin 构建生成 `auto-imports.d.ts` 或
  `components.d.ts`，禁止用手动运行时导入绕过问题；
- ESLint 的 `@typescript-eslint/no-restricted-imports` 是该约束的机器检查，禁止通过局部 disable 规避。

出现 Element Plus 默认蓝色 `#409eff` 时，优先执行以下排查，确认没有预编译 CSS 混入：

```bash
rg "element-plus/.*/style/(css|index)|element-plus/theme-chalk/.*\\.css" apps/admin/src
rg -o --glob "*.css" -- "--el-color-primary:[^;}]+" apps/admin/dist/css
```

## CRUD 页面结构

列表型 CRUD 页面统一使用以下结构：

```text
页面根容器 100% 宽高 flex column
  单一数据工作区 flex: 1; min-height: 0
    页面标题栏：左侧标题，右侧主要操作
    筛选表单
    表格区域 flex: 1; min-height: 0
    底部分页
  表单弹窗组件
```

标题栏、筛选、表格与分页必须位于同一个数据工作区内，由工作区统一提供边框、圆角和白色表面；各区域使用分隔线建立层级，禁止拆成多个彼此悬空的卡片。

页面职责只包括：

- 组合筛选、表格、分页和弹窗。
- 调用列表接口。
- 打开新增/编辑弹窗。
- 在弹窗成功后刷新列表。

页面内不要内联复杂表单逻辑；只服务当前页面的表单弹窗或抽屉放到页面的 `components/`。只有被两个及以上页面真实复用的稳定业务组件才能进入 `src/components/business/`。

### 标准 CRUD 落地范本

`src/views/system/role/index.vue` 是当前项目第一个完整 CRUD 范本。新增同类列表模块时，应按以下职责拆分，禁止把请求、表单和表格状态全部堆在页面入口：

```text
src/views/<module>/index.vue                         页面组合、表格列与弹框入口
src/views/<module>/composables/use-<module>-management.ts
                                                     列表、筛选、删除和刷新编排
src/views/<module>/components/<module>-form-dialog/  新增与编辑短表单
src/api/modules/<module>/                            HTTP 请求与接口类型
src/constants/modules/model.ts                       筛选配置、默认值和固定选项
src/types/modules/<module>.ts                        Admin 私有视图模型
packages/shared/src/types/modules/<module>.ts        前后端 HTTP 契约
apps/admin-api/src/modules/<module>/                 Controller、DTO、Service 和测试
```

标准实现顺序：

1. 先在 Shared 定义分页查询、列表项、详情、新增和编辑参数，前后端不得各自复制接口结构。
2. Server DTO 负责输入格式校验，Service 再执行唯一性、关联关系、系统数据保护等业务约束。
3. Admin 列表使用 `use-pagination.ts` 管理筛选、分页、loading、请求竞态和刷新；页面不得再维护第二套分页状态。
4. 筛选统一使用 `data-filter-panel`，表格统一使用 `admin-table`，短状态统一使用自动导入的 `BaseBadge`。
5. 空数据统一使用自动导入的 `BaseEmptyState`，禁止业务页面直接使用 `el-empty`；表格和局部内容使用 `layout="inline"`，占满剩余区域的空面板使用默认 `fill` 布局。
6. 行内或按钮内需要独立加载反馈时使用自动导入的 `CircleLoading`；页面遮罩仍按实际场景使用 `v-loading`，不得为加载动画重复引入第三方依赖。
7. 短且高度稳定的新增、编辑表单使用普通 `el-dialog`；权限树、素材列表等动态内容使用 `el-dialog + use-dialog-size.ts + el-scrollbar`。
8. 新增成功返回第一页，编辑或关联操作成功刷新当前页；删除当前页最后一条数据后自动回退上一页。
9. 列表接口和写操作都必须由权限码保护。界面隐藏按钮只能改善体验，不能替代 Server 权限校验。
10. Service 至少覆盖系统数据保护、关联删除保护和复杂关系写入等高风险边界测试。

角色基础信息与菜单授权是两个独立写入动作：基础编辑使用 `system:role:update`，菜单授权使用 `system:role:assign-menu`。不要因为共用一个页面而合并权限码，也不要允许修改系统内置超级管理员；超级管理员的全权限由 Server 保证，不依赖前端勾选结果。

## 内容 CRUD 发布状态

成品分类、成品、设备分类、设备产品等面向官网展示的内容模块统一使用一套全局状态，不允许新增 `isActive`、表单发布开关或按语言发布状态：

- 状态只允许 `PENDING`（待发布）和 `PUBLISHED`（已发布），新增由 Server 强制默认为待发布；
- 新增和编辑弹框只保存内容，不提供启用、草稿或发布控件；
- 默认情况下，待发布列表项显示“编辑、发布、删除”，已发布列表项只显示“下架”；
- 默认情况下，已发布记录禁止编辑、排序和删除，必须先下架；Admin 与 Server 必须同时执行该约束；
- 设备产品属于运营频繁维护内容：已发布设备产品允许直接编辑和调整排序权重。编辑保存时 Server 必须在事务内重新执行完整发布校验并保持发布状态；排序只更新展示顺序。删除仍必须先下架，下架仍执行关联成品保护；
- 发布前由 Server 统一校验中文、英文必填内容，不能依赖前端校验；
- 翻译记录只维护语言内容，不维护独立发布状态；
- 管理员账号可登录状态、询盘跟进状态等非内容业务状态不套用本规则。

## 分页协议

后台列表接口必须使用 shared 中的固定分页契约：

```ts
PaginationParams;
PaginationResult<TItem>;
```

默认分页规则：

- `pageNum` 默认 `1`。
- `pageSize` 默认 `20`。
- 可选分页大小固定为 `10`、`20`、`50`、`100`。
- 后端收到非法 `pageSize` 必须返回参数校验错误，不静默修正。

前端分页状态统一使用：

```text
apps/admin/src/composables/use-pagination.ts
```

`use-pagination.ts` 只管理分页、筛选、列表、loading 和标准分页结果，不直接依赖具体业务 API。

## 筛选面板

后台列表筛选统一使用：

```text
apps/admin/src/components/business/data-filter-panel/
```

第一阶段必须支持：

- `input`
- `select`
- `date`
- `daterange`

`select` 支持两类来源：

- 静态 `options`：适合角色、状态等固定枚举。
- `asyncOptions`：适合分类、部门、字典等接口选项。

优先由页面加载远程选项后传入 `options`；只有高度通用的选项才放到 `asyncOptions`。

## 表单弹窗与抽屉

只服务一个页面的业务表单弹窗与抽屉统一放在：

```text
apps/admin/src/views/<module>/components/<module>-form-dialog/
```

跨页面复用且边界稳定的表单组件才提升到 `apps/admin/src/components/business/`，不能为了保持页面入口简短而提前公共化。

### 容器选择边界

新增业务组件前必须先按内容规模和交互目的选择容器，不允许为了形式统一让所有表单都使用同一种方案：

| 类型               | 适用场景                                                         | 标准实现                              | 高度与滚动                                                                |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| 大型表单           | 多语言、富文本、字段分组较多，需要持续纵向录入                   | 右侧 `el-drawer`                      | 抽屉占满视口高度，Body 内使用 `el-scrollbar`，不使用 `use-dialog-size.ts` |
| 小型表单           | 字段少、高度稳定，在最小支持视口内可以完整展示                   | 直接使用 `el-dialog`                  | 不设置固定内容高度，不引入 `use-dialog-size.ts` 和 `el-scrollbar`         |
| 通用业务弹框或表单 | 需要保留居中对话语义，同时包含素材列表、动态内容等可能越界的内容 | `el-dialog` 配合 `use-dialog-size.ts` | 固定最大可视高度，由 `el-scrollbar` 承载内容滚动                          |

判断顺序必须是：先确认是否属于大型持续录入表单，是则使用抽屉；否则确认内容是否短且稳定，是则直接使用 `el-dialog`；其余需要居中展示且存在高度边界的通用业务弹框，才使用 `el-dialog + use-dialog-size.ts`。

表单容器组件通过 `defineExpose` 暴露最小命令式 API：

```ts
defineExpose({
  open,
});
```

`open` 使用统一操作类型：

```ts
import type { OperationType } from '@/types';
```

表单容器内部职责：

- 初始化表单。
- 表单校验。
- 调用新增/编辑接口。
- 成功后关闭当前容器并 `emit('success')`。

分类、所属对象等关联选择类 `el-select` 必须显式设置 `:clearable="true"`，允许录入人员撤销当前选择并重新选择。清空后的表单值使用 `undefined`，必填约束由表单校验规则负责。

排序等单行数字字段统一使用无控制按钮、文字左对齐的 `el-input-number`，禁止使用默认右对齐或上下调节按钮：

```vue
<el-input-number
  v-model="form.sortOrder"
  :min="CONTENT_SORT_ORDER_MIN"
  :max="CONTENT_SORT_ORDER_MAX"
  class="text-left"
  :controls="false"
/>
```

`text-left` 的公共覆盖样式统一维护在 `src/assets/element-plus/modules/ui.scss`。排序字段统一命名为“排序权重”，最小值和最大值使用 Shared 常量，禁止在组件和 DTO 中重复写数字。排序权重越大越靠前，权重相同时 ID 越大越靠前；字段下方必须提示“数字越大越靠前，新增内容默认排在最前”。新增时由 Server 查询当前模块最大排序权重并返回 `+1` 作为默认值，禁止根据当前分页列表推算。编辑时保留原排序权重。

页面收到 `success` 后刷新列表。

所有使用 `el-dialog` 的业务弹框必须统一配置公共遮罩、标题和垂直居中样式：

```vue
<el-dialog modal-class="dialog-custom-common" header-class="dialog-custom-header" :align-center="true" />
```

公共样式统一维护在 `src/assets/element-plus/modules/dialog.scss`，新增弹框不得另写一套遮罩和标题样式。

### `el-dialog` 内容、滚动与间距

`dialog-custom-common` 会把 `.el-dialog` 的默认 `padding` 设为 `0`，目的是让 Header、内容区和 Footer 各自维护准确边距。因此，使用该公共 class 后必须遵守以下结构，不能把表单或业务内容直接放进 `el-dialog` 默认插槽：

- 默认插槽必须先包裹一个以当前组件命名的根容器，例如 `admin-user-password-dialog`；
- 内容区必须由组件自己的 `__content` 或根容器设置 `padding`，不能依赖 Element Plus 默认边距；
- Footer 必须使用组件自己的 `__footer` 容器，并独立设置 `padding` 和顶部分隔线；
- 弹框宽度必须兼顾窄视口，优先使用 `min(<设计宽度>, calc(100vw - 32px))`；
- 仍使用居中对话框且内容可能超过一屏时，必须复用 `src/composables/use-dialog-size.ts` 计算可视范围内的固定最大高度；大型表单应改用抽屉；
- 固定高度容器内必须使用 `el-scrollbar` 承载滚动内容，禁止使用 `overflow-y: auto` 产生浏览器原生滚动条；
- Header 和 Footer 保持在滚动区之外，不能随长表单一起滚动。

通用长内容业务弹框使用以下标准结构：

```vue
<el-dialog
  v-model="dialogVisible"
  width="min(860px, calc(100vw - 32px))"
  modal-class="dialog-custom-common"
  header-class="dialog-custom-header"
  :align-center="true"
  @close="closeDialog"
>
  <div class="module-form-dialog" :style="{ height: `${dialogHeight}px` }">
    <el-scrollbar>
      <div class="module-form-dialog__content">
        <!-- 表单或业务内容 -->
      </div>
    </el-scrollbar>
  </div>

  <template #footer>
    <div class="module-form-dialog__footer">
      <!-- 操作按钮 -->
    </div>
  </template>
</el-dialog>
```

对应逻辑统一使用：

```ts
import { useDialogSize } from '@/composables/use-dialog-size';

const { dialogVisible, dialogHeight, openDialog, closeDialog } = useDialogSize(720);
```

#### `use-dialog-size` 使用边界

`use-dialog-size.ts` 只解决仍需使用居中对话框、但内容可能超出浏览器可视区域时的高度和滚动边界问题，不是所有业务弹框或表单的默认依赖。禁止为了形式统一，给内容短、字段数量固定且不存在越界风险的弹框增加固定高度和滚动容器，也禁止用它承载本应使用抽屉的大型表单。

以下情况不使用 `use-dialog-size.ts` 和 `el-scrollbar`：

- 新增子管理员、修改密码等字段较少且高度稳定的短表单；
- 确认提示、简单设置等内容不会随数据量明显增长的弹框；
- 在项目支持的最小视口下，Header、内容和 Footer 能够完整展示的弹框。

以下情况必须使用 `use-dialog-size.ts` 和 `el-scrollbar`：

- 素材列表、资源选择器等需要保持居中展示且高度会随数据变化的通用业务弹框；
- 需要保留对话框交互语义，但动态内容在最小视口下可能超出可视范围的弹框；
- 在项目支持的最小视口下，存在内容或 Footer 超出可视区域风险的弹框。

多语言、富文本、字段分组较多或需要持续纵向录入的大型表单不属于上述范围，统一使用右侧抽屉。

短内容弹框仍必须提供默认插槽根容器和 Footer 容器，并自行维护内容边距。`admin-user-form-dialog`、`admin-user-password-dialog` 可作为短表单结构范本，`media-asset-picker-dialog` 可作为长内容弹框结构范本。

### 长表单抽屉

成品、设备等字段较多且需要持续纵向录入的长表单统一使用右侧抽屉，避免宽屏弹框挤压纵向空间。使用以下结构：

```vue
<el-drawer v-model="drawerVisible" direction="rtl" append-to-body destroy-on-close modal-class="drawer-custom-common">
  <div class="module-form-dialog">
    <el-scrollbar>
      <div class="module-form-dialog__content">
        <!-- 表单内容 -->
      </div>
    </el-scrollbar>
  </div>

  <template #footer>
    <div class="module-form-dialog__footer">
      <!-- 操作按钮 -->
    </div>
  </template>
</el-drawer>
```

- 抽屉公共 Header、Body、Footer 和宽度覆盖统一维护在 `src/assets/element-plus/modules/drawer.scss`；
- 默认宽度为 `860px`，更复杂的表单通过公共 modifier 调整，仍必须限制在当前视口内；
- 默认插槽根容器必须占满抽屉 Body，并由 `el-scrollbar` 承载表单滚动；
- Header 和 Footer 必须位于滚动区之外；
- 抽屉天然占用完整视口高度，不引入 `use-dialog-size.ts`；该 hook 只服务于存在视口高度边界的居中弹框；
- `final-product-form-dialog` 是长表单抽屉范本。

### 富文本字段

- 仅在 PRD 明确需要结构化正文时使用富文本编辑器，普通标题、摘要、SEO 等短文本继续使用 `el-input`；
- Admin 统一复用 `src/components/business/rich-text-editor`，只开放业务需要的标题、段落、列表、引用和表格能力；
- 业务图片默认通过素材中心和显式媒体外键维护，富文本默认不提供图片上传或图片标签；
- PRD 明确允许图文混排的字段可以开启 `rich-text-editor` 的图片上传能力，但必须复用 OSS 直传和素材登记链路，并在素材删除时检查 HTML 中的实际引用，不能使用 Base64 或绕过素材中心；
- 富文本 HTML 必须由 Server 在入库前再次按白名单清理，发布校验应按清理后的可读文本判断是否为空，不能信任浏览器提交内容；
- 大型多语言富文本表单继续使用右侧抽屉，并通过 `content-language-tabs` 展示对应的中文原文参考。

## 表格样式

Element Plus 表格统一使用品牌类名：

```vue
<el-table class="admin-table" height="100%" />
```

表格列宽统一遵循以下约束：

- 操作列使用固定 `width` 并固定在右侧，保证按钮区域宽度稳定；
- 其余业务列全部使用 `min-width`，包括序号、状态、类型、数量和时间等短字段，让表格在宽屏下合理分配剩余空间；
- 禁止为了压缩当前页面而给普通业务列设置固定 `width`，内容较长时配合 `show-overflow-tooltip` 处理溢出。

表格覆盖样式维护在：

```text
apps/admin/src/assets/element-plus/modules/table.scss
```

并由：

```text
apps/admin/src/assets/element-plus/index.scss
```

统一聚合。

禁止继续使用旧项目命名 `cms-table`。

## 后台视觉基线

后续页面以当前管理员管理页面为视觉范本。后台强调统一工作表、清晰分隔和稳定信息密度，不通过堆叠卡片、阴影或多种浅灰底色制造层级。

### 应用外壳

- 页面底色统一使用 `var(--body-bg-color)`，当前值为 `#f5f5f5`。
- 侧栏使用 `var(--color-sidebar)` 深色表面，基础宽度统一使用 `var(--layout-sidebar-width)`；选中菜单使用低饱和深蓝表面和左侧品牌色指示线，不使用大面积高饱和主色铺底。
- `layout-side__brand` 与 `layout-header` 必须共同使用 `var(--layout-header-height)`，保证左右边界严格对齐。
- 顶部 Header 使用白色背景和底部分隔线；工具图标使用固定尺寸的图标按钮，不使用文字方块代替图标。
- 顶部 Header 只保留全局产品语义、工具和账号入口。当前两级导航不重复展示 `LY Fullstack Admin / 页面标题` 面包屑，三级及以上页面再按真实层级增加面包屑。

### 数据工作区

- 每个 CRUD 页面只保留一个完整数据工作区，禁止把标题、筛选、表格和分页拆成多张悬空卡片。
- 数据工作区、标题栏、筛选区、表头、正文和分页统一使用 `var(--color-surface)` 白色背景。
- 工作区内部通过 `var(--border-color)` 分隔、间距、字号和字重建立层级，不为相邻区域分配不同灰色背景。
- 工作区使用 `var(--radius-md)` 圆角；阴影只能保持当前弱层级，不使用明显悬浮阴影。
- 所有普通边框统一使用 `var(--border-color)`，禁止在页面、业务组件和 Element Plus 覆盖样式中硬编码边框色。

### 标题与操作

- 页面标题位于工作区左上角，使用主文字色、紧凑字号和明确字重建立层级，不机械添加品牌色竖线；不附加“共 N 条”等装饰性统计文案。
- 页面主要操作放在标题栏右侧，筛选操作放在筛选区右侧。
- CRUD 新增按钮默认使用纯文字，不为装饰效果机械添加图标。
- 搜索、重置等明确工具操作可以使用 `base-icon`，不得直接使用 Element Plus 图标组件。

### 筛选与表格

- 筛选区保持紧凑横向布局，字段在左、操作在右；窄屏时允许字段和操作区换行。
- 表格统一使用 `admin-table`，表头和数据行基础高度均为 `48px`。
- 表头通过字重和底部分隔线区别于正文，不依赖额外背景色。
- 表格正文保持白色，只在 hover、选中或禁用等交互状态改变背景。
- 角色、状态等短标签统一使用自动导入的 `BaseBadge`，不直接使用 `el-tag`。
- 日期时间必须转换为用户本地时区的可读格式，不直接展示 ISO 原始字符串。

### 分页、弹框与抽屉

- 分页必须位于数据工作区底部，通过顶部分隔线与表格连接，禁止悬空放在页面背景上。
- 分页区域基础高度为 `60px`，内容右对齐。
- 业务弹框与抽屉继续遵守本文“表单弹窗与抽屉”章节规定的公共 class、Header、Footer 和滚动边界。
- 弹框表单字段顺序、说明文案和校验信息必须贴合真实业务语义，不沿用数据库字段名作为用户文案。
- 表单字段下方用于介绍用途、填写规则或示例的帮助类文案，文字颜色统一使用 `var(--color-text-tertiary)`，字号固定为 `12px`。
- 所有使用 `content-language-tabs` 的常规多语言表单，都必须向组件传入与当前表单字段一一对应的中文原文参考；非中文页签统一在录入字段上方只读展示“中文原文参考”，并随中文内容实时更新，空值显示“未填写”。隐私政策、网站使用条款等正文很长且需要全屏录入的法律协议不展示中文原文参考，避免参考全文挤压编辑空间。
- 中文原文参考只帮助录入人员翻译，不重复保存数据，不在中文页签展示，也不能遗漏部分需要翻译的字段。样式统一由 `content-language-tabs` 维护，业务表单不得各自复制参考区结构和样式。

### 禁止事项

- 禁止在同一页面重复嵌套卡片。
- 禁止为了区分层级给标题、筛选、表头分别添加不同浅灰背景。
- 禁止使用大面积渐变、装饰光斑、厚重阴影和胶囊按钮。
- 禁止直接复制 Element Plus 默认视觉作为最终业务样式。

### 视觉令牌与交互

- 品牌蓝只用于主要操作、焦点、链接和当前状态，页面层级主要由白色、灰色、边界、间距和字重建立，禁止把多个相邻区域都改成蓝色。
- 页面底色固定使用 `var(--body-bg-color)`，当前为 `#f5f5f5`；数据工作区、筛选、表头、正文和分页统一使用白色表面。
- 成功、警告、危险和中性色必须使用 `tokens.scss` 中的语义变量，不在业务组件内硬编码状态颜色。
- 普通控件交互过渡统一控制在 `160ms` 左右，只允许颜色、背景和边框变化，不使用缩放、漂浮或位移动画。
- 键盘焦点必须清晰可见，统一使用品牌色外轮廓或 `var(--focus-ring-color)`，不得通过 `outline: none` 移除焦点反馈后不提供替代方案。

### 登录页

- 登录页使用左右分区布局：左侧承载品牌和视觉资产，右侧承载唯一登录表单，不使用居中悬浮大卡片或大面积渐变背景。
- 桌面端左侧视觉区和右侧表单区必须占满视口高度；窄屏隐藏视觉区，只保留品牌、表单和版权信息。
- 登录页只保留一个主标题，禁止在视觉区和表单区重复展示同义欢迎标题。
- 输入框和登录按钮基础高度为 `44px`，错误、加载、禁用和键盘焦点状态必须完整。
- “记住账号密码”只能在用户主动勾选且登录成功后写入 `js-cookie`，Cookie 键统一维护在 `src/constants/modules/storage.ts`，页面和 Store 禁止复制键名。
- 记住的账号密码与 Token、Pinia 状态和版本缓存使用不同存储边界；版本更新可以清理 localStorage、sessionStorage、CacheStorage 和旧 Service Worker，但禁止全量清除 Cookie。
- 浏览器可读 Cookie 无法安全保存真正的密钥，禁止使用 Base64 冒充加密；界面应明确由用户主动选择，代码中必须保留同站、HTTPS 和有效期约束。
