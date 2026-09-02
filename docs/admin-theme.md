# Admin 多主题与 Element Plus 定制方案

本文是 `apps/admin` 主题系统的实现说明和维护手册。它记录当前代码的真实做法，重点解释 Element Plus 如何通过 Sass 编译变量接入运行时主题，以及哪些导入方式会让定制失效。

后续更换电脑、升级依赖或交给新的开发者、AI 继续维护时，应先阅读本文，再修改主题相关代码。

## 目标与边界

当前 Admin 支持两套主题：

- `dark`：深色主题；
- `light`：浅色主题。

首次访问默认使用 `system` 偏好跟随操作系统；用户主动切换后保存明确的 `dark` 或 `light` 选择。

主题系统遵循以下原则：

1. 色板、主题语义和组件样式分层维护。
2. 切换主题只修改根节点 `data-theme`，不在组件中批量切换 class。
3. Element Plus 必须通过 Sass 源码编译接入主题，禁止混入预编译 CSS。
4. 业务组件只消费语义变量，不感知具体色值。
5. 只有无法通过 Element Plus Sass 变量控制的 DOM 状态，才写带业务作用域的选择器覆盖。
6. Canvas、WebGL 和图表等不会自动响应 CSS 变量的资源，通过类型安全的全局事件主动重建或更新。

## 整体链路

主题系统不是一份 SCSS 文件，而是两条互相配合的链路。

```text
固定色板 tokens.scss
        │
        ▼
dark / light 语义变量 theme.scss
        │
        ├──────────────► 业务组件 SCSS：直接使用 var(--...)
        │
        ▼
Element Plus var.scss：把 Sass map 映射到语义变量
        │
        ▼
Element Plus Sass 源码编译生成 --el-* 变量和组件样式
```

运行时切换链路：

```text
主题按钮
  → useTheme.toggleTheme()
  → Theme Store 持久化 ThemePreference
  → html[data-theme] 更新
  → CSS 语义变量立即切换
  → admin-theme-change 原生事件通知 Canvas / WebGL / ECharts
```

## 文件职责

| 文件                                                            | 职责                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/admin/src/assets/styles/modules/tokens.scss`              | 固定色板、字号、间距、圆角和动效原子变量；不表达业务语义          |
| `apps/admin/src/assets/styles/modules/theme.scss`               | 在 `dark`、`light` 下把色板映射为背景、文字、控件、浮层等语义变量 |
| `apps/admin/src/assets/element-plus/modules/var.scss`           | 在 Element Plus Sass 首次加载前配置官方 Sass map                  |
| `apps/admin/src/assets/element-plus/index.scss`                 | Element Plus Sass 定制唯一聚合入口                                |
| `apps/admin/src/assets/styles/modules/component-overrides.scss` | 必须命中第三方内部 DOM 的业务作用域覆盖                           |
| `apps/admin/src/composables/use-theme.ts`                       | 同步系统颜色偏好、`data-theme`、View Transition 和主题变更事件    |
| `apps/admin/src/stores/modules/theme.ts`                        | 持久化 `ThemePreference` 并派生当前 `ThemeName`，不直接操作 DOM   |
| `apps/admin/src/types/modules/base.ts`                          | 维护 `ThemeName` 和 `ThemePreference`                             |
| `apps/admin/index.html`                                         | 在 Vue 启动前按持久化偏好和系统主题写入实际 `data-theme`          |
| `apps/admin/build/rsbuild.base.config.ts`                       | 注入 Element Plus Sass 入口并配置自动导入 Resolver                |

## 三层变量模型

### 第一层：原子色板

固定颜色只允许定义在 `tokens.scss`。变量描述颜色本身，不描述使用场景。

```scss
:root {
  --palette-green-400: #1de9a0;
  --palette-green-700: #087f5b;
  --palette-dark-950: #050706;
  --palette-white: #ffffff;
}
```

业务组件不得直接依赖色板。色板可以被主题语义变量和少量绘图代码消费。

### 第二层：主题语义变量

`theme.scss` 负责回答“这个颜色用在哪里”。同一个变量必须在两套主题中都定义。

```scss
:root,
html[data-theme='dark'] {
  --color-primary: var(--palette-green-700);
  --color-bg-page: var(--palette-dark-950);
  --input-fill-color: var(--palette-dark-875);
  --control-fill-color: var(--input-fill-color);
  --overlay-fill-color: var(--palette-dark-850);
}

html[data-theme='light'] {
  --color-primary: var(--palette-green-700);
  --color-bg-page: var(--palette-neutral-75);
  --input-fill-color: var(--palette-white);
  --control-fill-color: var(--input-fill-color);
  --overlay-fill-color: var(--palette-white);
}
```

当前常用语义组：

| 语义组     | 代表变量                                                                            | 用途                                      |
| ---------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| 品牌与状态 | `--color-primary`、`--color-accent`                                                 | 主按钮、选中态、焦点、深色主题高亮        |
| 页面与表面 | `--color-bg-page`、`--fill-color`                                                   | 页面背景、Panel 背景                      |
| 文字       | `--color-text-primary/secondary/tertiary`                                           | 正文、副标题、提示文本                    |
| 控件       | `--control-fill-color`、`--control-hover-fill-color`、`--control-active-fill-color` | Input、Select、Button 等通用控件状态      |
| 禁用       | `--control-disabled-*`                                                              | 禁用背景、文字和边框                      |
| 浮层       | `--overlay-fill-color`                                                              | Select Dropdown、Popover 等 Teleport 浮层 |
| 模态遮罩   | `--modal-backdrop-color`                                                            | Dialog 背后的页面压暗层                   |
| 遮罩       | `--mask-fill-color`、`--mask-extra-light-fill-color`                                | `v-loading` 和按钮 Loading 遮罩           |
| 空状态     | `--empty-fill-color-0` 至 `--empty-fill-color-9`                                    | `el-empty` 默认 SVG 的完整色阶            |
| 菜单       | `--menu-hover-*`、`--menu-active-*`                                                 | 侧栏菜单和菜单树                          |

新增语义变量时必须同时补齐 `dark` 和 `light`。不得只在当前正在看的主题下定义。

### 第三层：组件消费

业务组件只使用语义变量：

```scss
.example-panel {
  border: 1px solid var(--border-color);
  background: var(--fill-color);
  color: var(--color-text-primary);
}
```

禁止在业务组件中复制主题判断：

```scss
// 禁止：组件自己维护主题色值
html[data-theme='dark'] .example-panel {
  background: #0c100f;
}
```

组件确实存在主题结构差异时，可以使用 `data-theme`，但颜色仍应来自语义变量。当前 Fluid Glass Card 的 WebGL 渲染差异属于这种特殊情况。

## Element Plus 为什么需要两阶段适配

Element Plus 的样式同时包含两种机制：

1. Sass map：在编译组件 SCSS 时决定默认变量和值；
2. `--el-*` CSS 变量：组件在浏览器中实际消费的运行时变量。

本项目使用混合方案：通过 `var.scss` 配置 Element Plus Sass map，但 map 的多数值指向项目的运行时语义变量。

```scss
@forward 'element-plus/theme-chalk/src/common/var.scss' with (
  $input: (
    'text-color': var(--color-text-primary),
    'bg-color': var(--input-fill-color),
    'border-color': var(--border-color),
  ),
  $button: (
    'bg-color': var(--control-fill-color),
    'hover-bg-color': var(--control-hover-fill-color),
  )
);
```

编译后得到的关系类似：

```css
:root {
  --el-input-bg-color: var(--input-fill-color);
  --el-button-bg-color: var(--control-fill-color);
  --el-button-hover-bg-color: var(--control-hover-fill-color);
}
```

因此切换 `html[data-theme]` 时，不需要重新编译 Element Plus，组件会跟随项目语义变量实时变化。

### `$colors` 为什么仍使用固定色值

`$colors` 中的品牌色、成功色、警告色等仍是 Sass 颜色：

```scss
$colors: (
  'primary': (
    'base': #087f5b,
  ),
);
```

Element Plus 会在编译期使用 Sass 颜色函数计算 `light-3`、`light-5`、`dark-2` 等色阶，所以这里不能简单替换成 `var(--color-primary)`。

当前深浅主题使用同一个主色 `#087f5b`。如果未来要求不同主题使用不同主色色阶，需要在 `theme.scss` 中完整覆盖对应的 `--el-color-primary`、`--el-color-primary-light-*` 和 `--el-color-primary-dark-*`，不能只修改 `$colors.base`。

## Sass 注入顺序：最重要的正确性条件

Element Plus 的 `@forward ... with` 只有在官方变量模块第一次加载时才有效。因此 `var.scss` 必须先于任何 Element Plus 组件 Sass 被加载。

当前 Rsbuild 配置通过 Sass `additionalData` 给每个 SCSS 编译单元前置注入：

```ts
pluginSass({
  sassLoaderOptions: {
    additionalData: `@use "@/assets/element-plus/index.scss" as *;`,
  },
});
```

Element Plus 组件和 API 由同一份 Resolver 按需加载：

```ts
ElementPlusResolver({
  importStyle: 'sass',
});
```

两个条件缺一不可：

- `additionalData` 保证变量定制先进入 Sass 编译单元；
- `importStyle: 'sass'` 保证 Resolver 加载的是可被配置的 Sass 源码，而不是已经编译完成的默认 CSS。

## 严禁手动导入 Element Plus 运行时和样式

以下写法会绕过或污染统一入口：

```ts
// 禁止：手动导入运行时组件或 API
import { ElMenu, ElMessageBox } from 'element-plus';

// 禁止：引入预编译组件样式
import 'element-plus/es/components/menu/style/css';
import 'element-plus/es/components/menu/style/index';
```

```scss
// 禁止：业务 SCSS 直接加载官方组件样式
@use 'element-plus/theme-chalk/src/menu.scss';
```

正确方式：

- Vue 模板直接使用 `el-*` 组件；
- `ElMessage`、`ElMessageBox`、`ElNotification`、`ElLoading` 等直接使用自动导入名称；
- Element Plus 类型使用 `import type`；
- 缺少自动导入声明时重新运行 Admin 构建，禁止用手动 import 临时绕过。

ESLint 已通过 `no-restricted-imports` 对 `apps/admin/src/**/*.{ts,vue}` 执行机器检查。不得添加局部 disable 绕过。

## `var.scss` 当前覆盖范围

`var.scss` 不只配置品牌色。当前已覆盖以下官方 Sass map：

| Sass map                                                         | 解决的问题                                       |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `$colors`                                                        | 品牌色和状态色基础色阶                           |
| `$text-color`                                                    | Element Plus 主文案、普通文案、提示与禁用文字    |
| `$border-color`                                                  | 全局边框色阶                                     |
| `$fill-color`                                                    | 通用 Fill 色阶；也是多个组件的间接依赖           |
| `$bg-color`                                                      | 页面和 Teleport 浮层背景                         |
| `$disabled`                                                      | 通用禁用状态                                     |
| `$mask-color`                                                    | `v-loading` 遮罩和按钮 Loading 遮罩              |
| `$menu`                                                          | 侧栏菜单颜色、尺寸和间距                         |
| `$input`、`$input-disabled`                                      | Input 正常、Hover、Focus、Placeholder 和禁用状态 |
| `$radio`、`$radio-button`、`$radio-disabled`、`$radio-checked`   | Radio 与 Radio Button 全状态                     |
| `$select`、`$select-option`、`$select-group`、`$select-dropdown` | Select 输入区域、选项、分组和下拉浮层            |
| `$popover`、`$popper`                                            | Popover 内容、边框、标题和箭头背景               |
| `$button`                                                        | 默认按钮正常、Hover、Active、禁用和 Focus 状态   |
| `$dropdown`                                                      | Dropdown 菜单项 Hover 背景和文字                 |
| `$empty`                                                         | Empty 默认 SVG 的 0–9 全部填充色                 |

Alert 的浅色状态没有独立的颜色 Sass map，而是直接消费编译期生成的 `--el-color-*-light-9`。
项目在 `assets/element-plus/modules/alert.scss` 中使用状态语义变量适配其背景、边框与文字，禁止在业务弹框中局部修补。

### 间接变量不能漏

维护 Element Plus 时不能只看组件名称对应的 map。很多内部节点使用的是全局变量。

已经验证过的典型关系：

- `.el-input__count-inner` 使用 `--el-fill-color-blank`，因此要配置 `$fill-color['blank']`，只配置 `$input` 不够；
- Select Wrapper 使用 `--el-fill-color-blank`，下拉浮层又依赖 `$select-dropdown` 和 `$bg-color['overlay']`；
- 默认 Button 会同时使用 `$button`、`$fill-color` 和 `$disabled`；
- Popover 箭头还会消费 `$popper` 或浮层背景；
- `v-loading` 遮罩直接使用 `$mask-color`，不是 `$loading`；`$loading` 只维护 Spinner 尺寸；
- Empty 插画不是单色图标，而是消费 `$empty` 的 0–9 十个 SVG 填充变量。

## 什么时候使用 `component-overrides.scss`

优先使用 `var.scss`。只有官方 Sass map 没有暴露目标状态，或者业务组件需要独有结构时，才使用选择器覆盖。

当前菜单树选中态就是一个例子。Element Plus 把 `highlight-current` 背景直接写成 `--el-color-primary-light-9`，没有独立的 current Sass 变量。本项目要求选中态与 Hover 完全一致，因此在业务作用域内覆盖：

```scss
.menu-tree-panel {
  .el-tree {
    --el-tree-node-hover-bg-color: var(--menu-hover-background);
  }

  .el-tree.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content {
    background: var(--el-tree-node-hover-bg-color);
    color: var(--menu-hover-text-color);
  }
}
```

这里必须保留 `.menu-tree-panel` 业务边界，并确保选择器权重大于 Element Plus 默认规则。禁止写全局裸选择器：

```scss
// 禁止：会影响所有 Tree，且无法判断业务来源
.el-tree-node.is-current > .el-tree-node__content {
  background: ...;
}
```

组件 scoped 样式中同样禁止 `:deep()`。需要命中 Element Plus 内部 DOM 时统一进入 `component-overrides.scss`。

## 主题状态、持久化与动画

### ThemeName 与 ThemePreference

实际主题和用户偏好只能使用共享类型：

```ts
export type ThemeName = 'dark' | 'light';
export type ThemePreference = ThemeName | 'system';
```

`ThemeName` 约束 DOM、事件参数、Canvas 和 WebGL 最终使用的明暗主题；`ThemePreference` 只在 Store
表达跟随系统或用户明确选择。各模块禁止重新声明字符串联合类型。

### Store 是状态真相源

`useThemeStore` 使用 `pinia-plugin-persistedstate` 保存 `themePreference`，并结合系统主题派生只读
`themeName`：

```ts
persist: {
  key: 'APP_PINIA_THEME',
  pick: ['themePreference'],
}
```

Store 会兼容旧版本持久化的 `themeName` 字段，已经明确选择深浅主题的用户升级后不会被重置。

Pinia 必须先执行 `app.use(pinia)`，之后才能创建任何依赖插件的 Store。提前创建 Store 会导致持久化插件没有挂载到该实例。

### Composable 负责副作用

启动入口先调用 `setupAdminTheme()` 读取并监听 `prefers-color-scheme`，返回的清理函数负责移除媒体查询监听。
组件不得直接同时修改 Store 和 DOM，统一调用 `useTheme()`：

- `setTheme()`：更新 Store、`document.documentElement.dataset.theme` 并广播事件；
- `toggleTheme()`：计算下一个主题，并在浏览器支持时运行 View Transition 圆形扩散；
- 用户开启“减少动态效果”时直接切换，不播放扩散动画。

### 默认主题

`apps/admin/index.html` 保留浅色无脚本兜底，并在 Vue 与样式加载前同步执行主题初始化脚本：

```html
<html lang="zh-CN" data-theme="light"></html>
```

初始化脚本优先读取持久化的 `system`、`dark` 或 `light` 偏好；没有有效偏好时通过
`prefers-color-scheme` 跟随操作系统。它与 `setupAdminTheme()` 使用同一决策顺序，避免 Vue 恢复状态前短暂闪现错误主题。

## Canvas、WebGL 和图表如何响应主题

CSS DOM 会自动跟随变量变化，但已经写入 Canvas 或 WebGL Uniform 的颜色不会自动更新。

`useTheme.setTheme()` 会派发浏览器原生事件：

```ts
window.dispatchEvent(new Event(ADMIN_THEME_CHANGE_EVENT));
```

需要主动重绘的组件应：

1. `onMounted` 通过 `window.addEventListener` 订阅 `ADMIN_THEME_CHANGE_EVENT`；
2. 更新图表配置或销毁并重建渲染器；
3. `onBeforeUnmount` 通过 `window.removeEventListener` 取消订阅并释放资源。

当前 Dashboard 图表和 Fluid Glass Card 可以作为范本。禁止为了普通 DOM 颜色订阅该事件，普通 DOM 应继续使用 CSS 变量。

## 新增或修复 Element Plus 组件的标准流程

遇到某个组件在深色或浅色主题下不正确时，按以下顺序处理。

### 第一步：确认没有错误导入

```bash
rg "element-plus/.*/style/(css|index)|element-plus/theme-chalk/.*\\.css" apps/admin/src
```

如果存在预编译样式，先删除错误导入并确认自动导入配置，不能立即写高权重 CSS 强压。

### 第二步：查看当前安装版本的源码

不要凭记忆猜 Sass map 名称。直接检查：

```text
apps/admin/node_modules/element-plus/theme-chalk/src/common/var.scss
apps/admin/node_modules/element-plus/theme-chalk/src/<component>.scss
```

先确认目标 DOM 最终使用哪个 `--el-*` 变量，再追溯该变量由哪个 Sass map 生成。Element Plus 升级后 map 名称、键名和内部依赖都可能变化。

### 第三步：建立项目语义变量

如果现有语义变量不能准确表达目标状态：

1. 在 `tokens.scss` 补固定色板，确实需要时才新增；
2. 在 `theme.scss` 的 `dark` 和 `light` 中同时新增语义变量；
3. 命名描述用途，不描述某个页面。

### 第四步：配置官方 Sass map

在 `var.scss` 的唯一 `@forward ... with` 中补对应 map。键名必须与当前 Element Plus 源码完全一致，包括大小写，例如 `$dropdown` 使用 `menuItem-hover-fill`。

不要创建第二个 `@forward common/var.scss with (...)`，Sass 模块只能在第一次加载时配置。

### 第五步：必要时增加业务作用域覆盖

只有无法通过 Sass map 表达时才修改 `component-overrides.scss`。先复用 `--el-*` 或项目语义变量，再提高到刚好足够的选择器权重，禁止使用 `!important` 作为默认方案。

### 第六步：同时检查两套主题和全部状态

至少检查：

- normal；
- hover；
- focus-visible；
- active / selected；
- disabled；
- loading；
- empty；
- Teleport 到 `body` 的 Dropdown、Popover、Tooltip 等浮层。

只检查静态截图不够。很多错误只在 Hover、首次加载或下拉浮层打开时出现。

## 常见错误与定位

### 出现默认蓝色 `#409eff`

最可能的原因是手动导入了 Element Plus 预编译 CSS，或者 Resolver 的 `importStyle` 不再是 `sass`。

```bash
rg "#409eff" apps/admin/dist/css
rg -o --glob "*.css" -- "--el-color-primary:[^;}]+" apps/admin/dist/css
```

正确产物应包含：

```text
--el-color-primary:#087f5b
```

### Input 正常但计数器背景错误

不要给 `.el-input__count-inner` 写局部背景。检查 `$fill-color['blank']` 是否映射到 `--control-fill-color`。

### Select 输入区正常但下拉层错误

下拉层通常 Teleport 到 `body`，业务容器 scoped 样式无法覆盖。检查 `$select-option`、`$select-dropdown`、`$bg-color['overlay']` 和 `$popper`。

### Dropdown 在深色主题下 Hover 发白

检查 `$dropdown['menuItem-hover-fill']`，默认值是编译期浅色 `primary-light-9`。

### Empty 在深色主题下仍是浅灰插画

检查 `$empty` 的 `fill-color-0` 至 `fill-color-9` 是否全部映射。只改文字颜色不会影响 SVG。

### `v-loading` 出现大片透明白块

检查 `$mask-color`。Loading 遮罩背景不由 `$loading` 控制。

### Tree 选中态仍是浅色块

检查 Element Plus 的 `.el-tree--highlight-current` 规则是否覆盖了业务选择器。选中态与 Hover 应共用 `--el-tree-node-hover-bg-color`，并使用带 `.menu-tree-panel` 的更高权重规则。

### 修改 `var.scss` 后看起来没有变化

依次检查：

1. 是否存在手动 CSS / Style Import；
2. `additionalData` 是否仍在注入 Element Plus 定制入口；
3. Resolver 是否仍使用 `importStyle: 'sass'`；
4. 修改的 map 和键名是否对应当前安装版本；
5. 目标组件是否实际消费另一个全局变量；
6. 清理构建缓存并重新执行 Admin 构建，而不是继续叠加选择器。

## 验证命令

主题修改完成后，至少执行：

```bash
pnpm --filter @repo/admin typecheck
pnpm lint
pnpm format:check
pnpm --filter @repo/admin exec rsbuild build --env-mode development --config build/rsbuild.prod.config.ts
```

上面的 Admin 构建命令使用本地开发环境配置，适合主题开发阶段自查。正式 `pnpm build` 会读取仓库提交的 Admin `.env.production`；该文件只允许保存最终会暴露给浏览器的公开配置，服务端密钥仍按 `docs/environment.md` 注入。

涉及共享类型、Store、事件或跨包代码时执行完整检查：

```bash
pnpm check
```

构建后可直接核对生成变量：

```bash
rg -o --glob "*.css" -- "--el-color-primary:[^;}]+" apps/admin/dist/css
rg -o --glob "*.css" -- "--el-(input|button|popover|dropdown|empty)-[^:]+:[^;}]+" apps/admin/dist/css
```

最后必须在深色和浅色主题下手动打开目标组件，检查 Hover、选中、禁用、Loading、Empty 和浮层状态。

## 修改前自查清单

- [ ] 已阅读本文和 `.rules/admin.md` 的“Element Plus 唯一样式入口”。
- [ ] 没有手动导入 Element Plus 运行时组件、API 或预编译样式。
- [ ] 已查看当前 `node_modules` 中对应组件的 Sass 源码，没有猜 map 名称。
- [ ] 新语义变量已同时定义 dark 和 light。
- [ ] 业务组件没有直接消费固定色板或硬编码主题色。
- [ ] 优先修改 `var.scss`，选择器覆盖只用于 Sass map 无法控制的状态。
- [ ] 第三方 DOM 覆盖带有业务 Block 作用域，没有裸 `.el-*` 和 `:deep()`。
- [ ] Teleport 浮层、Hover、Active、Disabled、Loading 和 Empty 已实际检查。
- [ ] 类型、Lint、格式、测试和构建结果已如实确认。

## 规则优先级

Admin 的 Element Plus 自动导入和主题方案以以下顺序为准：

1. `.rules/admin.md` 规定 Admin 专属强制边界；
2. 本文记录当前实现细节和排错方法；
3. `.rules/style.md`、`.rules/vue3.md` 规定通用样式与 Vue 规则。

通用规则与 Admin 专属规则存在表述差异时，以 `.rules/admin.md` 和当前 Rsbuild 配置为准。不得把其他项目或旧项目的 Element Plus 引入方式直接套到本仓库。
