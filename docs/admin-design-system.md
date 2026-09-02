---
version: 1.0.0
status: current
scope: apps/admin
last-updated: 2026-08-23
---

# Admin 设计系统与页面视觉规范

本文是 LY Fullstack Admin 的设计契约。它记录当前项目已经形成并实际落地的视觉语言，用于指导开发者和 AI 继续开发风格一致的页面，也用于反向检查已有页面是否发生视觉漂移。

本文不是新的设计提案，不授权重新设计现有页面。遇到文档与代码不一致时，先以本文列出的标准页面和真实 Token 实现为依据核对；确认设计发生变化后，代码与本文必须在同一次修改中同步更新。

## 1. 使用边界

开始设计或实现 Admin 页面前，按以下顺序阅读：

1. 本文：确认页面应该呈现的视觉语言和结构。
2. [`admin-theme.md`](./admin-theme.md)：确认主题变量与 Element Plus 定制链路。
3. [`.rules/admin.md`](../.rules/admin.md)：确认 Admin 页面和 CRUD 工程范本。
4. [`.rules/style.md`](../.rules/style.md)：确认 SCSS、BEM 和覆盖样式落点。
5. 对应的标准页面：确认真实结构、尺寸和交互细节。

本文负责回答“应该长成什么样”，`admin-theme.md` 负责回答“主题为什么这样工作”，`.rules/` 负责回答“代码应该如何组织”。三者不能互相替代。

## 2. 设计定位

LY Fullstack Admin 的视觉定位是：**克制、精确、有技术感的全栈管理后台**。

它不是传统模板后台的蓝白拼装，也不是依赖大面积光效、网格和悬浮卡片制造的概念稿。页面首先服务真实管理任务，在清晰、稳定和信息效率成立后，再使用品牌绿色、细边界、轻量渐变和少量动态视觉建立辨识度。

### 2.1 核心特征

- **黑白双主题，同一品牌身份**：两套主题改变明暗关系，不改变品牌色、组件结构和交互语义。
- **品牌绿色是唯一主线**：主要操作、激活状态、数据重点和成功语义围绕绿色展开，蓝、黄、红只承担必要的辅助或状态含义。
- **边界建立层级**：大多数深度来自背景、填充和 1px 边界，不依赖普遍阴影。
- **紧凑但不拥挤**：以 14px 为正文基准，12px 为最小字号，间距遵循 4px 基础节奏。
- **连续工作区优先**：CRUD 页面是一块完整工作区，不把标题、筛选、表格和分页拆成四张悬浮卡片。
- **特色集中使用**：WebGL 流体卡片、登录页机械视觉等只出现在明确场景，不扩散为全站装饰。
- **真实产品感优先**：界面像可长期使用的管理工具，不像营销落地页或 AI 生成的概念图。

### 2.2 明确禁止的视觉倾向

- 不增加常见的 AI 网格背景、无意义星点、随机光球、满屏 Aurora 或大面积霓虹。
- 不为了“高级感”给每一个容器增加阴影、渐变、毛玻璃和大圆角。
- 不把每个内容区都包成独立卡片，也不重复嵌套同等级卡片。
- 不擅自引入第二套主色，不因浅色主题“显得淡”就把品牌改成蓝色或紫色。
- 不复制外部模板的页面骨架、Tailwind 风格、组件结构或视觉主题。
- 不让装饰抢过数据、操作和状态本身。

## 3. 设计真相源

| 层级                  | 文件                                                            | 职责                                                            |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| 原子 Token            | `apps/admin/src/assets/styles/modules/tokens.scss`              | 固定色板、字号、间距、圆角、时长和缓动                          |
| 主题语义              | `apps/admin/src/assets/styles/modules/theme.scss`               | `dark` / `light` 下的背景、文字、控件、菜单、图表和特色组件语义 |
| 全局基础              | `apps/admin/src/assets/styles/modules/base.scss`                | Reset、根容器、字体栈和基础排版                                 |
| CRUD 骨架             | `apps/admin/src/assets/styles/modules/crud.scss`                | 列表型后台页面的连续工作区结构                                  |
| Element Plus 编译变量 | `apps/admin/src/assets/element-plus/modules/var.scss`           | 官方 Sass Map 的唯一覆盖入口                                    |
| Element Plus 通用外观 | `apps/admin/src/assets/element-plus/modules/*.scss`             | Table、Dialog、Drawer、Feedback 等通用覆盖                      |
| 业务结构覆盖          | `apps/admin/src/assets/styles/modules/component-overrides.scss` | 必须命中第三方内部 DOM 的业务作用域覆盖                         |
| 组件私有样式          | 对应组件的 `index.scss`                                         | 只控制组件自身模板和布局                                        |

禁止在业务组件中重新定义一套平行 Token。需要新的主题相关视觉值时，先判断它属于原子色板、全局语义还是组件语义，再放入正确层级。

## 4. Token 系统

### 4.1 字体

默认字体栈以 `Inter`、`PingFang SC` 和系统无衬线字体为主。正文基准为 14px，通过 `--font-scale` 支持整体缩放。

| Token              | 默认值 | 推荐用途                         |
| ------------------ | -----: | -------------------------------- |
| `--font-size-xs`   |   12px | 时间、说明、状态补充、图表轴文字 |
| `--font-size-sm`   |   13px | 表单标签、次要按钮、面包屑       |
| `--font-size-base` |   14px | 正文、表格、菜单、标准按钮       |
| `--font-size-md`   |   15px | 较强正文、小标题                 |
| `--font-size-lg`   |   16px | 面板标题、CRUD 页面标题          |
| `--font-size-xl`   |   18px | 展示页模块标题                   |
| `--font-size-2xl`  |   20px | 独立展示页标题                   |

规则：

- 网页文字最小为 12px，禁止出现 10px、11px 等不可读字号。
- 管理页面主要依靠字号、字重和文字颜色建立层级，不使用多套字体。
- 常规标题字重以 600 为主，品牌标题和关键数字可以使用 650–700。
- 数据和时间需要稳定对齐时使用等宽数字；代码和编码字段使用等宽字体。
- 只有结果页状态码、Dashboard 指标值、登录页主文案等明确展示场景可以突破常规字号范围。

### 4.2 间距

间距以 4px 为基础单位：

| Token           |   值 |
| --------------- | ---: |
| `--spacing-xs`  |  4px |
| `--spacing-sm`  |  8px |
| `--spacing-md`  | 12px |
| `--spacing-lg`  | 16px |
| `--spacing-xl`  | 20px |
| `--spacing-2xl` | 24px |

优先使用 Token。只有组件尺寸经过明确设计验证时，才使用 18px、28px、32px 等中间值。禁止在同一页面中无规则混用大量相近间距。

### 4.3 圆角

| Token / 值          | 用途                                 |
| ------------------- | ------------------------------------ |
| `--radius-sm` / 4px | 小型控件、局部标签                   |
| `--radius-md` / 8px | 标准按钮、输入框、面板、菜单项、弹框 |
| 12px                | 登录卡片等少量更柔和的大容器         |
| 16px                | Fluid Glass 指标卡片专用             |
| 50% / 999px         | 头像、状态点、Badge 等真实圆形或胶囊 |

圆角必须有层级含义。不能因为组件更大就自动使用 20px 以上圆角。

### 4.4 动效

| Token               |                           值 | 用途                  |
| ------------------- | ---------------------------: | --------------------- |
| `--duration-fast`   |                        120ms | Hover、颜色和背景反馈 |
| `--duration-normal` |                        180ms | 激活、展开、轻量位移  |
| `--ease-standard`   | `cubic-bezier(0.2, 0, 0, 1)` | 全站标准缓动          |

动效只用于解释状态变化，不用于让静态页面持续运动。必须尊重 `prefers-reduced-motion`；定时器、Canvas、WebGL、事件监听和观察器在组件卸载时必须释放。

## 5. 颜色与双主题

### 5.1 品牌颜色

- 品牌主色：`--color-primary`，当前深浅主题均映射为 `--palette-green-700`（`#087f5b`）。
- 活力强调色：`--color-accent`，映射为 `--palette-green-400`（`#1de9a0`）。
- 主色负责按钮、激活、边界和主要交互；强调色只在需要更亮反馈的深色场景谨慎使用。
- Element Plus 编译期主色必须与 `--color-primary` 的品牌基准保持一致。

### 5.2 主题语义

| 语义     | 深色主题       | 浅色主题     | 使用方式                 |
| -------- | -------------- | ------------ | ------------------------ |
| 页面背景 | 近黑绿色       | 中性浅灰     | `--color-bg-page`        |
| 主表面   | 深色轻渐变填充 | 白色         | `--fill-color`           |
| 输入表面 | 深灰绿         | 白色         | `--input-fill-color`     |
| 边界     | 低透明薄荷色   | 低透明石墨色 | `--border-color`         |
| 主文字   | 近白薄荷色     | `#333` 层级  | `--color-text-primary`   |
| 次文字   | 中灰薄荷色     | `#666` 层级  | `--color-text-secondary` |
| 提示文字 | 暗灰绿色       | `#999` 层级  | `--color-text-tertiary`  |
| 浮层     | 深色不透明表面 | 白色表面     | `--overlay-fill-color`   |

组件只能消费语义变量，不能在组件内部判断主题后写两套十六进制颜色。主题差异统一由 `html[data-theme='dark']` 和 `html[data-theme='light']` 提供。

### 5.3 状态颜色

- 主要、成功、警告、危险和中性状态分别使用 `--status-*-text-color` 与 `--status-*-fill-color`。
- 状态色优先用于图标、文字、圆点和低饱和填充，不使用大面积纯色背景。
- 删除、失败和紧急提醒使用危险色；普通停用状态通常使用警告或中性语义，不默认使用危险色。
- 蓝色只作为图表第二序列或必要的信息辅助色，不能成为第二品牌色。

## 6. 表面、边界与层级

### 6.1 标准层级

| 层级       | 表现                                               | 典型场景                   |
| ---------- | -------------------------------------------------- | -------------------------- |
| 页面底层   | `--color-bg-page`，无边框                          | Layout Body、页面滚动区    |
| 连续工作区 | `--fill-color` + 1px 边框 + 8px 圆角               | CRUD 页面                  |
| 独立面板   | `--fill-color` + 1px 边框 + 8px 圆角               | Dashboard 图表、待办、动态 |
| 控件表面   | `--control-fill-color` + 边框                      | Input、Button、Select      |
| 浮层       | `--overlay-fill-color` + 边框 + `--overlay-shadow` | Dialog、Popover、Dropdown  |

### 6.2 使用原则

- 普通内容面板默认无阴影；浅色主题也不靠阴影堆叠层级。
- 阴影主要保留给真正脱离文档流的浮层，以及浅色登录卡片。
- 同级面板的边框、圆角和背景必须一致。
- 同一页面若决定使用面板边界，所有同级面板统一使用；禁止只有部分卡片出现额外顶部线或伪元素边界。
- 结果页外层内容不使用背景、边框和圆角；只有内部详情区可以建立次级表面。
- 避免“卡片里面再放同级卡片”。嵌套内容需要层级时，应降低边界或填充强度。

## 7. 应用骨架

### 7.1 全局 Layout

```text
应用根容器（100% 宽高，禁止页面整体溢出）
  侧栏（240px 固定宽度，100% 高度）
  主内容（flex: 1，100% 高度）
    顶栏（60px 固定高度）
    页面 Body（flex: 1，min-height: 0）
      当前页面自行持有 el-scrollbar 或内部滚动区
```

- 侧栏和主内容保持明确边界，不给应用外层增加页面留白。
- Header 只保留下边界；深色主题背景透明，浅色主题背景为白色语义表面。
- 页面根节点必须 `width: 100%; height: 100%; min-height: 0`，滚动责任必须明确。
- 长菜单由侧栏内部 `el-scrollbar` 承担，长页面由页面内部 `el-scrollbar` 承担，禁止依赖 `body` 滚动。

### 7.2 侧栏导航

- 只给一级菜单展示 Lucide 图标，二级和三级菜单不展示图标。
- 二级菜单文字与一级菜单图标后的文字起点对齐；三级菜单在此基础上增加一个标准层级缩进。
- 激活项使用品牌色文字、左侧 2px 内边界和低透明品牌渐变。
- Hover 比激活态更弱，不使用纯白、纯黑或默认 Element Plus 蓝色背景。
- 展开、收起和 Popper 中的菜单必须保持同一主题语义。

### 7.3 顶栏

- 高度固定为 60px，左右操作按钮为 36px 方形热区、8px 圆角。
- 左侧为侧栏收缩、刷新和面包屑；右侧为全屏、通知、主题切换和用户入口。
- 默认图标颜色使用次级文字色，Hover 变为品牌色并出现低透明品牌填充。
- 头像使用品牌渐变，文字取昵称首字符。
- 通知、用户菜单等 Teleport 浮层使用统一 Overlay 表面，不在页面局部写裸 `.el-popover` 覆盖。

## 8. 组件视觉配方

### 8.1 图标

- 项目图标统一使用 `@lucide/vue`，不使用 Element Plus 自带图标库。
- 常规操作图标默认 16–18px，功能面板图标容器通常为 32–36px。
- 同一功能在全站使用同一图标语义，不因页面不同随机更换。
- 方向箭头、关闭、展开等系统操作图标按需使用，但图标选择器应过滤大量无业务意义的方向类图标。
- 图标必须服务识别，不用作大面积背景水印。

### 8.2 Button

- 主要动作使用 `el-button type="primary"`，每个操作区域原则上只有一个视觉主按钮。
- 次要动作使用默认按钮，危险动作使用 `type="danger"`。
- 表格行操作使用 Link Button，避免一行出现多个实心按钮。
- 标准按钮文字为 14px / 600；不为单个页面写独立主按钮颜色。
- Hover、Active、Disabled 和 Focus 由 Element Plus 变量统一提供。

### 8.3 Input、Select 与表单

- 输入框、Select、Radio、计数器和下拉浮层必须同时适配两套主题。
- 标准输入高度由 Element Plus 体系控制；登录页输入高度为经过设计确认的 46px 特例。
- 表单标签通常为 13px，使用次级文字色；帮助和校验说明不小于 12px。
- 短表单使用 Dialog；动态树、长列表或大型编辑内容使用可滚动 Dialog 或 Drawer。
- 禁止在业务页通过手动导入 Element Plus CSS 修复单个控件。

### 8.4 Badge、Empty 与 Loading

- 状态和类型使用自动导入的 `BaseBadge`，颜色由语义 Tone 决定。
- 空数据使用自动导入的 `BaseEmptyState`，禁止业务页直接使用 `el-empty`。
- 表格空状态和局部空状态使用 `layout="inline"`；占满剩余区域时使用默认 Fill 布局。
- 行内或按钮内独立加载反馈使用 `CircleLoading`；页面级请求可以使用已经主题化的 `v-loading`。

### 8.5 Table

- 业务表格统一添加 `admin-table`。
- 表头、行和固定列共享当前工作区表面，固定列不得出现不同底色。
- 标准单元格高度为 48px，表头字重 600。
- 表格正文使用次级文字色；名称等主识别字段可以提升到主文字色和 500 字重。
- 时间、编码、辅助信息使用 12px 或等宽字体，但不得低于 12px。
- 操作列使用固定宽度并固定在右侧，保持克制宽度，避免无限堆叠操作。
- 除操作列外，序号、状态、类型、数量、时间等所有业务列统一使用最小宽度，让宽屏空间由各列共同伸展，不使用固定宽度锁死布局。

### 8.6 Dialog、Drawer 与浮层

- Dialog 使用 `dialog-custom-common`；自定义标题结构使用 `dialog-custom-header`。
- Drawer 使用 `drawer-custom-common`，大型资料编辑使用 `--wide`，真正需要占满视口时使用 `--fullscreen`。
- 通用浮层必须不透明到足以阻断下层文字，不允许深色 Dialog 透出下层内容。
- Header、Body、Footer 使用 1px 边界建立结构，不重复添加阴影和卡片。
- Dropdown、Popover、Select Dropdown 必须使用 `--overlay-fill-color` 和统一 Hover 语义。

### 8.7 消息反馈

- 成功、警告和错误消息统一通过 `src/feedback/modules/message.ts` 触发。
- 对应 `app-message-success`、`app-message-warning`、`app-message-error` 自定义类。
- 消息表面保持当前主题，语义色用于图标、文字和低强度边界，不使用刺眼整块色底。

### 8.8 Dashboard 面板与图表

- 常规 Dashboard 面板统一使用 `--fill-color`、1px `--border-color` 和 8px 圆角，无阴影。
- 面板标题 16px / 600，眉题和说明为 12px，状态标签为 12px。
- 图表第一序列使用品牌绿，第二序列使用辅助蓝；网格线、坐标和 Tooltip 必须读取主题变量。
- 折线宽度保持 1px，避免营销图表式粗线。
- 柱状图 Hover 与品牌绿处于同一色阶，不切换为默认蓝色。
- 演示数据必须显式标注“演示数据”，不能伪装为真实系统指标。

### 8.9 Fluid Glass 指标卡片

- Fluid Glass 是 Dashboard 顶部指标区的品牌特例，不是全站通用卡片样式。
- 四张卡片使用同一视觉配方，通过 WebGL 动态纹理形成层次，不使用四套随机配色。
- 深浅主题复用同一内容结构和流体动态语言，但底层 WebGL 分主题实现：深色使用透明发光流体，浅色使用左侧留白、右侧实体品牌绿的高密度流体，禁止再通过给深色材质简单混白来生成浅色效果。
- 卡片无阴影，使用 16px 圆角和主题边界；Hover 只做轻微上移与边界增强。
- 内容层始终位于 Canvas、Fallback 和高光层之上，文本颜色只读取主题语义变量；浅色主题右侧趋势值必须保证在实体绿色背景上的对比度。
- WebGL 失败时必须有主题对应的静态 Fallback；主题切换需要销毁旧渲染器并在新 Canvas 节点上重建，离开页面必须释放 Canvas、事件、观察器和 WebGL 上下文。

## 9. 标准页面模板

### 9.1 CRUD 列表页

角色管理是标准 CRUD 范本，结构固定为：

```text
admin-crud-page
  admin-crud-page__workspace
    admin-crud-page__header（标题 + 单一主要操作）
    data-filter-panel
    admin-crud-page__table（admin-table）
    admin-crud-page__pagination
  页面私有 Dialog / Drawer
```

设计要求：

- 页面内边距桌面端 16px，窄屏 12px。
- 标题、筛选、表格和分页共享一个连续表面，以分隔线区分区域。
- 不把筛选区、表格和分页分别做成悬浮卡片。
- 筛选字段桌面端标准宽度 280px，窄屏改为整行。
- 表格占据剩余高度，分页固定在工作区底部。

标准样例：

- `apps/admin/src/views/system/role/index.vue`
- `apps/admin/src/views/system/user/index.vue`

### 9.2 树形编辑页

菜单管理是树形编辑范本：左侧负责结构和搜索，右侧负责当前节点属性。两侧属于同一工作区，依靠分隔线而不是悬浮卡片划分。

- 树节点 Hover 与 Current 使用同一低透明背景。
- 拖拽句柄、节点类型和状态信息保持弱化，不抢菜单名称。
- 属性表单按主题化的 Input、Select、Radio 和 Switch 实现。
- 图标选择使用项目自己的 Lucide 选择器，不要求用户手写图标名。

标准样例：`apps/admin/src/views/system/menu/index.vue`。

### 9.3 Dashboard

Dashboard 是展示型页面，不套用 CRUD 工作区：

```text
页面内部 Scrollbar
  内容区（16px padding）
    主区 + 右侧区
      四张指标卡
      两张图表面板
      系统运行概览
      待办事项 + 最新动态
```

- Desktop 主区与右侧区使用 Grid，右侧宽度约 300–360px。
- 常规间距为 16px，指标卡之间为 12px。
- 容器变窄时先变为单列主区，再将四指标降为两列和一列。

标准样例：`apps/admin/src/views/dashboard/index.vue`。

### 9.4 登录页

- Desktop 使用左侧品牌视觉、右侧登录表单的双栏结构，比例约 56% / 44%。
- 左侧只承载 Logo、机械视觉和品牌文案，不放后台截图，不增加 AI 网格。
- 机械图片在视觉区居中，图片在上、文字在下。
- 右侧表单卡片宽度不超过 420px，保持真实登录产品的克制感。
- 小于 820px 隐藏左侧视觉，展示移动端品牌并让表单独占页面。
- “记住账号”使用 Cookie 保存，不能依赖可能被版本更新清理的 Local Storage；密码交给浏览器密码管理器，禁止写入应用 Cookie。

标准样例：`apps/admin/src/views/login/index.vue`。

### 9.5 结果页与异常页

- 成功和失败页采用居中上下结构：状态图标、标题、说明、必要详情、操作按钮。
- 404 和 500 保留圆形轨道、淡化状态码和中心图标，整体仍按视觉、标题、说明、按钮上下排列。
- 页面外层不增加大卡片背景、边框和圆角。
- 语义颜色分别来自成功、危险和警告 Token，不在页面中写死颜色。

标准样例：`apps/admin/src/views/display/components/display-result-page/index.vue`。

### 9.6 组件展示页

- 展示页仍使用后台现有页面背景、边界和排版，不做独立营销站风格。
- 页面标题清晰说明组件用途，不增加无意义英文 Eyebrow。
- 示例区域保持一个明确焦点。例如视频页只保留居中的 960px 播放器，不堆叠无关侧栏和 Poster。
- 外部库提供官方文档入口，但不在项目中复制整套官方 Demo。

标准样例：

- `apps/admin/src/views/component/icon/index.vue`
- `apps/admin/src/views/component/video/index.vue`

## 10. 响应式规则

项目不是只为 1920px 截图设计。响应式以内容能否继续完成任务为判断标准：

- 侧栏折叠由 Layout 状态控制，不通过缩小菜单文字硬塞内容。
- Dashboard 使用 Container Query，根据实际内容宽度调整列数。
- CRUD 筛选区在 960px 以下换行，720px 以下字段占满整行。
- Header 在 760px 以下隐藏面包屑和昵称，保留核心操作。
- Dialog、Drawer、结果页和登录页在窄屏降低内边距，但字号不得跌破最小值。
- 表格列较多时允许表格内部横向滚动，不通过极端压缩列宽破坏可读性。

## 11. Element Plus 接入红线

Element Plus 的视觉一致性依赖正确的 Sass 注入顺序。这不是普通代码风格偏好，而是主题能否生效的正确性条件。

- Vue 模板中的 `el-*` 组件交给 `unplugin-vue-components` 自动导入。
- `ElMessage`、`ElMessageBox`、`ElNotification`、`ElLoading` 等交给自动导入。
- 禁止业务源码手动导入 `element-plus` / `element-plus/es` 运行时组件。
- 禁止导入 `*/style/css`、`*/style/index` 和 `theme-chalk/*.css`。
- Element Plus 类型可以使用 `import type`。
- 通用变量优先在 `var.scss` 的官方 Sass Map 中解决。
- 全站通用 DOM 外观放入 `assets/element-plus/modules/`。
- 单个业务组件内部覆盖放入 `component-overrides.scss`，并以业务 BEM Block 限定作用域。
- 禁止在 Scoped 样式中使用 `:deep()`、`::v-deep`、`/deep/` 或 `>>>`。

完整原理和故障排查见 [`admin-theme.md`](./admin-theme.md)。

## 12. Do / Don't

### Do

- 先复用 Token、基础组件和标准页面，再新增样式。
- 同时在深色和浅色主题中检查 Default、Hover、Active、Focus、Disabled、Loading 和 Empty。
- 用 1px 边界和细微表面差异建立层级。
- 让页面入口负责组合，让私有组件负责独立 UI 区块。
- 让主要操作、选中态和关键指标稳定使用品牌绿色。
- 保持文案真实、简洁、中文优先，演示数据明确标识。
- 保证组件卸载后释放事件、定时器、图表、Canvas 和 WebGL 资源。

### Don't

- 不直接复制外部 Admin 模板的 UI 和页面骨架。
- 不在业务 SCSS 中写主题色十六进制值。
- 不给单个组件私自定义新的品牌色、阴影体系或圆角体系。
- 不用默认 Element Plus 蓝色作为临时修补。
- 不把内容页全部变成“大标题 + 英文 Eyebrow + 多张悬浮卡片”的 AI 套路。
- 不使用无业务意义的图标、渐变、背景网格和持续动画。
- 不因为某一套主题难适配就为两套主题维护两份组件模板。
- 不牺牲可读性换取单张截图的视觉密度。

## 13. AI 开发流程

AI 新增或修改页面时必须执行以下步骤：

1. **识别页面类型**：CRUD、树形编辑、Dashboard、登录、结果页还是组件展示页。
2. **选择标准样例**：至少读取一个同类型现有页面及其 SCSS。
3. **列出可复用项**：Token、`BaseBadge`、`BaseEmptyState`、`CircleLoading`、`DataFilterPanel`、`admin-table`、Dialog / Drawer Class。
4. **先搭结构再做装饰**：确认滚动、宽高、响应式和信息层级后，才处理颜色与动效。
5. **只消费语义变量**：若缺少语义变量，说明使用范围后补充主题层，不在组件中写两套颜色。
6. **验证两套主题**：不能只在默认深色主题下完成页面。
7. **对照自查清单**：逐项核对结构、主题、组件、响应式和资源释放。

AI 不得把“参考某个页面”理解为复制其所有装饰。参考的优先级是：信息架构与交互目的 > LY Fullstack 既有设计系统 > 外部页面局部启发。

## 14. 页面完成自查清单

### 结构

- [ ] 页面类型明确，并使用了对应标准模板。
- [ ] 页面根容器宽高、`min-height: 0` 和滚动责任明确。
- [ ] 没有重复嵌套同等级卡片。
- [ ] 主操作唯一且位置稳定，危险操作语义明确。
- [ ] 空、加载、错误和无权限状态均有落点。

### 视觉

- [ ] 所有文字不小于 12px。
- [ ] 字号、间距、圆角优先使用现有 Token。
- [ ] 同级面板背景、边框、圆角和阴影一致。
- [ ] 没有无意义网格、光球、英文 Eyebrow 或装饰图标。
- [ ] 没有把外部模板的品牌色和视觉语言带入项目。

### 主题

- [ ] 深色和浅色主题均检查完成。
- [ ] Hover、Active、Focus、Disabled、Loading、Empty 和 Overlay 均可读。
- [ ] 组件中没有主题相关硬编码颜色。
- [ ] Dialog、Popover、Dropdown 和 Tooltip 不透出下层文字。
- [ ] 没有出现 Element Plus 默认蓝色 `#409eff`。

### 组件与工程

- [ ] 已复用现有 Base / Business 组件，没有重复造轮子。
- [ ] Element Plus 组件和运行时未被手动导入。
- [ ] 未导入任何 Element Plus 预编译样式。
- [ ] 未使用样式穿透，第三方 DOM 覆盖位于正确全局模块。
- [ ] SCSS 遵循 BEM，组件私有样式未泄漏到全局。
- [ ] 图表、Canvas、WebGL、事件和定时器在卸载时释放。

### 验证命令

```bash
# 禁止的 Element Plus 样式入口
rg "element-plus/.*/style/(css|index)|element-plus/theme-chalk/.*\\.css" apps/admin/src

# 禁止样式穿透
rg ":deep\\(|::v-deep|/deep/|>>>" apps/admin/src

# 排查散落在组件样式中的固定色值；tokens.scss、SVG 和必要第三方代码需人工复核
rg "#[0-9a-fA-F]{3,8}" apps/admin/src --glob "*.scss" --glob "*.vue"

# 最低工程验证
pnpm --filter @repo/admin typecheck
pnpm lint
pnpm --filter @repo/admin build:prod
```

## 15. 规范变更原则

- 单个页面的临时需求不能直接升级为全局设计规则。
- 至少两个真实场景稳定复用后，才考虑沉淀为通用组件或全局配方。
- 修改品牌色、字号阶梯、圆角、页面骨架或 Element Plus 接入方式属于设计系统变更，必须说明原因和影响范围。
- 设计系统变更必须同时检查登录页、Dashboard、菜单管理、角色管理、用户管理、结果页以及深浅主题。
- 本文记录当前已确认的设计事实。尚未实现的想法必须标记为提案，不能写成现行规范。

LY Fullstack 项目组
