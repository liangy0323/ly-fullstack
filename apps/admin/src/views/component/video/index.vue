<template>
  <section class="video-showcase-page">
    <el-scrollbar class="video-showcase-page__scrollbar">
      <div class="video-showcase-page__content">
        <header class="video-showcase-page__header">
          <div>
            <h1 class="video-showcase-page__title">西瓜视频播放器</h1>
            <p class="video-showcase-page__description">
              基于字节跳动开源播放器构建，可作为管理后台课程、素材预览和运营视频的统一播放基础。
            </p>
          </div>

          <a
            class="video-showcase-page__guide-link"
            href="https://h5player.bytedance.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            官方文档
            <external-link :size="16" :stroke-width="1.8" />
          </a>
        </header>

        <section class="video-showcase-page__player-panel">
          <div class="video-showcase-page__panel-heading">
            <div>
              <h2 class="video-showcase-page__panel-title">基础播放示例</h2>
              <p class="video-showcase-page__panel-description">当前使用官方演示视频，业务接入时替换资源地址即可。</p>
            </div>
            <base-badge tone="success" dot>已接入</base-badge>
          </div>

          <xg-video-player :url="XGPLAYER_DEMO_URL" />
        </section>
      </div>
    </el-scrollbar>
  </section>
</template>

<script setup lang="ts">
import { ExternalLink } from '@lucide/vue';
import XgVideoPlayer from './components/xg-video-player/index.vue';

/**
 * 西瓜播放器官方演示视频地址
 */
const XGPLAYER_DEMO_URL = 'https://s2.pstatp.com/cdn/expire-1-M/byted-player-videos/1.0.0/xgplayer-demo.mp4';
</script>

<style lang="scss" src="./index.scss" scoped></style>
