<template>
  <article
    ref="cardRef"
    class="fluid-glass-card"
    :class="[`fluid-glass-card--${currentThemeName}`, { 'fluid-glass-card--fallback': isFallback }]"
    :style="cardStyle"
  >
    <template v-if="currentThemeName === 'dark'">
      <canvas
        :key="currentThemeName"
        ref="canvasRef"
        class="fluid-glass-card__canvas fluid-glass-card__canvas--dark"
        aria-hidden="true"
      ></canvas>
      <div class="fluid-glass-card__fallback fluid-glass-card__fallback--dark" aria-hidden="true"></div>
      <div class="fluid-glass-card__noise" aria-hidden="true"></div>
    </template>
    <template v-else>
      <div class="fluid-glass-card__light-icon" aria-hidden="true">
        <component :is="props.icon" :size="22" :stroke-width="1.8" />
      </div>
    </template>

    <div class="fluid-glass-card__content">
      <p class="fluid-glass-card__eyebrow">{{ props.eyebrow }}</p>
      <h3 class="fluid-glass-card__title">{{ props.title }}</h3>
      <div class="fluid-glass-card__metric">
        <strong class="fluid-glass-card__value">{{ props.value }}</strong>
        <span v-if="props.unit" class="fluid-glass-card__unit">{{ props.unit }}</span>
      </div>
      <p class="fluid-glass-card__change">
        <span>{{ props.metaLabel }}</span>
        <span :class="trendClass">{{ props.trendText }}</span>
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Component, CSSProperties } from 'vue';

/**
 * 原生主题事件用于在根节点主题切换完成后重建与主题对应的片元着色器。
 */
import { ADMIN_THEME_CHANGE_EVENT } from '@/constants';

/**
 * 主题 Composable 提供组件首次挂载时使用的当前主题真相源。
 */
import { useTheme } from '@/composables/use-theme';

/**
 * Fluid Glass 渲染器封装 WebGL 程序、指针交互和销毁回调。
 */
import { createFluidGlassRenderer } from './renderer';

/**
 * 主题名称类型约束组件只能进入项目已注册的明暗主题分支。
 */
import type { ThemeName } from '@/types';

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 指标所属的业务分类短文案。
   */
  eyebrow: string;

  /**
   * 指标卡片主标题。
   */
  title: string;

  /**
   * 指标展示值，允许携带已经格式化的千分位或缩写。
   */
  value: string;

  /**
   * 浅色指标卡右侧用于区分业务类型的图标组件。
   */
  icon: Component;

  /**
   * 指标值后的可选单位。
   */
  unit?: string;

  /**
   * 趋势值左侧的比较口径说明。
   */
  metaLabel: string;

  /**
   * 已格式化的趋势或成功率文案。
   */
  trendText: string;

  /**
   * 趋势语义，用于选择正向或负向状态色。
   */
  trendTone?: 'positive' | 'negative';

  /**
   * WebGL 流体材质的第一主色。
   */
  colorA?: string;

  /**
   * WebGL 流体材质的第二主色。
   */
  colorB?: string;

  /**
   * WebGL 流体材质的第三主色。
   */
  colorC?: string;

  /**
   * 流体噪声随时间变化的速度系数。
   */
  speed?: number;

  /**
   * 流体颜色和形变的整体强度系数。
   */
  intensity?: number;

  /**
   * 指针移动对流体形变的影响系数。
   */
  pointer?: number;

  /**
   * 卡片材质表面层的透明度。
   */
  surface?: number;

  /**
   * 噪声随机种子，用于让多张卡片拥有不同纹理分布。
   */
  seed?: number;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  unit: '',
  trendTone: 'positive',
  colorA: '#1de9a0',
  colorB: '#34d8ff',
  colorC: '#075f54',
  speed: 0.9,
  intensity: 1,
  pointer: 0.8,
  surface: 0.08,
  seed: 1.7,
});

/**
 * 只读取当前主题名称；主题切换仍由全局 Composable 统一修改和广播。
 */
const { themeName } = useTheme();

const cardRef = useTemplateRef<HTMLElement>('cardRef');
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
const isFallback = ref(false);
const currentThemeName = ref<ThemeName>(themeName.value);
let destroyRenderer: (() => void) | undefined;
let rendererGeneration = 0;

/**
 * 趋势类名负责选择状态色，卡片行内变量负责把可配置 WebGL 颜色同步给 CSS 降级材质。
 */
const trendClass = computed(() =>
  props.trendTone === 'positive'
    ? 'fluid-glass-card__change-value--positive'
    : 'fluid-glass-card__change-value--negative',
);
const cardStyle = computed<CSSProperties>(() => ({
  '--fluid-a': props.colorA,
  '--fluid-b': props.colorB,
  '--fluid-c': props.colorC,
  '--surface-opacity': String(props.surface),
}));

/**
 * 按主题重建卡片渲染器
 *
 * WebGL 程序在创建时固定片元着色器，因此主题变化时需要销毁旧上下文，并在 Vue 替换画布节点后
 * 创建新程序。递增序号用于阻止用户快速切换主题时较早的异步任务覆盖最终主题。
 *
 * @param nextThemeName 需要渲染的主题
 */
const setupRenderer = async (nextThemeName: ThemeName): Promise<void> => {
  const currentGeneration = ++rendererGeneration;
  destroyRenderer?.();
  destroyRenderer = undefined;
  isFallback.value = false;
  currentThemeName.value = nextThemeName;
  await nextTick();

  if (currentGeneration !== rendererGeneration) {
    return;
  }

  if (nextThemeName === 'light') {
    return;
  }

  if (!cardRef.value || !canvasRef.value) {
    isFallback.value = true;
    return;
  }

  destroyRenderer = createFluidGlassRenderer(
    cardRef.value,
    canvasRef.value,
    {
      colorA: props.colorA,
      colorB: props.colorB,
      colorC: props.colorC,
      speed: props.speed,
      intensity: props.intensity,
      pointer: props.pointer,
      surface: props.surface,
      seed: props.seed,
    },
    () => {
      isFallback.value = true;
    },
  );
};

/**
 * 收到全局主题通知后切换卡片材质
 */
const handleThemeChange = (): void => {
  void setupRenderer(themeName.value);
};

/**
 * 生命周期函数
 */
onMounted(() => {
  window.addEventListener(ADMIN_THEME_CHANGE_EVENT, handleThemeChange);
  void setupRenderer(themeName.value);
});

onBeforeUnmount(() => {
  window.removeEventListener(ADMIN_THEME_CHANGE_EVENT, handleThemeChange);
  rendererGeneration += 1;
  destroyRenderer?.();
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
