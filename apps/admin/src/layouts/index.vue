<template>
  <div class="admin-layout">
    <layout-side :collapsed="sidebarCollapsed" />

    <section class="admin-layout__main">
      <layout-header :sidebar-collapsed="sidebarCollapsed" @sidebar-toggle="handleSidebarToggle" />
      <main class="admin-layout__content">
        <router-view v-slot="{ Component, route }">
          <transition :name="transitionName" mode="out-in" appear>
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 后台布局由固定侧栏和顶部栏组成，业务页面通过 RouterView 注入内容区域。
 */
import LayoutHeader from '@/components/layouts/layout-header/index.vue';
import LayoutSide from '@/components/layouts/layout-side/index.vue';

/**
 * 页面切换动画名（动画类定义见 `assets/styles/modules/router-transition.scss`）
 */
const PAGE_TRANSITION = 'slide-left';

const sidebarCollapsed = ref(false);

/**
 * 首次加载不播放切换动画，避免刷新进入后台时的整页闪动
 */
const isFirstLoad = ref(true);

const transitionName = computed(() => (isFirstLoad.value ? '' : PAGE_TRANSITION));

/**
 * 切换侧栏折叠状态
 */
const handleSidebarToggle = (): void => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

onMounted(() => {
  // 延迟一帧，确保首次渲染完成后再放开切换动画
  nextTick(() => {
    isFirstLoad.value = false;
  });
});
</script>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--body-bg-color);

  &__main {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }

  &__content {
    flex: 1;
    overflow: hidden;
  }
}
</style>
