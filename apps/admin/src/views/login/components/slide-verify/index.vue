<template>
  <div class="slide-verify" @selectstart.prevent>
    <div class="slide-verify__picture" :style="pictureStyle">
      <img
        class="slide-verify__background"
        :src="props.challenge.backgroundImage"
        alt=""
        draggable="false"
        @load="handleImageReady"
      />
      <img
        class="slide-verify__puzzle"
        :src="props.challenge.puzzleImage"
        alt=""
        draggable="false"
        :style="puzzleStyle"
        @load="handleImageReady"
      />

      <div v-if="props.loading" class="slide-verify__loading">
        <circle-loading :size="30" />
      </div>

      <button class="slide-verify__refresh" type="button" aria-label="刷新图片验证" @click="emit('refresh')">
        <RefreshCw :size="17" />
      </button>
    </div>

    <div ref="sliderTrackRef" class="slide-verify__track" :class="trackStateClass" data-testid="login-captcha-track">
      <div class="slide-verify__mask" :style="sliderMaskStyle"></div>
      <span>{{ statusText }}</span>
      <button
        class="slide-verify__handle"
        type="button"
        role="slider"
        aria-label="拖动滑块完成图片验证"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(progress * 100)"
        :aria-valuetext="statusText"
        :disabled="isInteractionDisabled"
        :style="sliderStyle"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerCancel"
      >
        <Check v-if="props.resultState === 'success'" :size="18" />
        <X v-else-if="props.resultState === 'fail'" :size="18" />
        <LoaderCircle v-else-if="props.resultState === 'verifying'" class="slide-verify__spinner" :size="18" />
        <ChevronsRight v-else :size="18" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronsRight, LoaderCircle, RefreshCw, X } from '@lucide/vue';

import type { SlideVerifyResultState } from '@/types';
import type { AdminCaptchaResponse } from '@repo/shared/types';

import { useSlideVerify } from './composables/use-slide-verify';

/**
 * 图片滑块组件输入参数
 */
interface Props {
  /**
   * Admin API 生成的当前图片挑战
   */
  challenge: AdminCaptchaResponse;

  /**
   * 挑战请求或图片资源是否仍在加载
   */
  loading?: boolean;

  /**
   * Admin API 对当前拖动位置的校验状态
   */
  resultState?: SlideVerifyResultState;
}

/**
 * 图片滑块组件事件
 */
interface Emits {
  /**
   * 用户松开滑块后提交实际偏移量
   */
  (event: 'verify', offset: number): void;

  /**
   * 用户主动刷新挑战
   */
  (event: 'refresh'): void;

  /**
   * 背景图和拼图块都已经加载完成
   */
  (event: 'ready'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  resultState: 'default',
});
const emit = defineEmits<Emits>();

/**
 * 计数当前挑战的两张 Data URL 图片，两者都完成后才允许拖动。
 */
const readyImageCount = ref(0);

/**
 * 按服务端图片尺寸维持验证区域比例
 */
const pictureStyle = computed(() => ({
  aspectRatio: `${props.challenge.imageWidth} / ${props.challenge.imageHeight}`,
}));

/**
 * 只有请求、图片加载和服务端校验全部结束后才允许继续拖动
 */
const isInteractionDisabled = computed(
  () => props.loading || readyImageCount.value < 2 || props.resultState !== 'default',
);

/**
 * 统计图片就绪状态并通知弹框关闭加载层
 */
const handleImageReady = (): void => {
  readyImageCount.value += 1;
  if (readyImageCount.value === 2) {
    emit('ready');
  }
};

watch(
  () => props.challenge.captchaId,
  () => {
    readyImageCount.value = 0;
  },
);

const {
  sliderTrackRef,
  progress,
  trackStateClass,
  puzzleStyle,
  sliderStyle,
  sliderMaskStyle,
  statusText,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
} = useSlideVerify({
  getChallenge: () => props.challenge,
  getResultState: () => props.resultState,
  isLoading: () => isInteractionDisabled.value,
  onVerify: (offset) => emit('verify', offset),
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
