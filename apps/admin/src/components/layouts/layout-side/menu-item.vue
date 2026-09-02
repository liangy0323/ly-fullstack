<template>
  <el-sub-menu
    v-if="hasChildren"
    :index="props.item.key"
    :aria-label="props.root ? props.item.title : undefined"
    :expand-close-icon="ChevronDown"
    :expand-open-icon="ChevronUp"
    :popper-class="props.root ? 'layout-side__menu-popper' : ''"
  >
    <template #title>
      <component
        :is="props.item.icon"
        v-if="props.root && props.item.icon"
        class="layout-side__menu-icon"
        :size="18"
        :stroke-width="1.8"
      />
      <span>{{ props.item.title }}</span>
    </template>

    <layout-menu-item v-for="child in props.item.children" :key="child.key" :item="child" />
  </el-sub-menu>

  <el-menu-item v-else :index="props.item.key" :aria-label="props.root ? props.item.title : undefined">
    <component
      :is="props.item.icon"
      v-if="props.root && props.item.icon"
      class="layout-side__menu-icon"
      :size="18"
      :stroke-width="1.8"
    />
    <span>{{ props.item.title }}</span>
  </el-menu-item>
</template>

<script setup lang="ts">
/**
 * 展开与收起图标只用于一级菜单标题，二级及更深层级保持纯文本展示。
 */
import { ChevronDown, ChevronUp } from '@lucide/vue';

/**
 * 导航节点类型与当前登录会话转换后的侧栏树保持同源。
 */
import type { AdminNavItem } from '@/types';

defineOptions({
  name: 'LayoutMenuItem',
});

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 当前导航树节点
   */
  item: AdminNavItem;

  /**
   * 是否为导航树根节点
   */
  root?: boolean;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  root: false,
});

/**
 * 当前节点是否拥有子菜单
 */
const hasChildren = computed(() => Boolean(props.item.children?.length));
</script>
