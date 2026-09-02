import Player from 'xgplayer';
import 'xgplayer/dist/index.min.css';

import type { ShallowRef } from 'vue';

/**
 * 管理西瓜播放器的初始化与资源释放
 *
 * @param playerRef 播放器挂载节点
 * @param url 需要播放的视频资源地址
 */
export const useVideoPlayer = (playerRef: Readonly<ShallowRef<HTMLElement | null>>, url: string): void => {
  let player: Player | undefined;

  onMounted(() => {
    if (!playerRef.value) {
      return;
    }

    player = new Player({
      el: playerRef.value,
      url,
      autoplay: false,
      fluid: true,
      lang: 'zh-cn',
    });
  });

  onBeforeUnmount(() => {
    player?.destroy();
    player = undefined;
  });
};
