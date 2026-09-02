<template>
  <div class="xg-video-player">
    <div ref="playerRef" class="xg-video-player__mount"></div>
  </div>
</template>

<script setup lang="ts">
import { useVideoPlayer } from './composables/use-video-player';

/**
 * 西瓜视频播放器输入属性
 */
interface Props {
  /**
   * 需要播放的视频资源地址
   */
  url: string;
}

const props = defineProps<Props>();

/**
 * 西瓜播放器实例的挂载节点
 */
const playerRef = useTemplateRef<HTMLElement>('playerRef');

useVideoPlayer(playerRef, props.url);
</script>

<style lang="scss" scoped>
.xg-video-player {
  overflow: hidden;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--palette-dark-950);

  &__mount {
    width: 100%;
    height: 100%;
  }
}
</style>
