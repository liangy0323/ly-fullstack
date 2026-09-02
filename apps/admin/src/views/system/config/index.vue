<template>
  <section class="public-config-page admin-crud-page">
    <section class="admin-crud-page__workspace">
      <header class="admin-crud-page__header">
        <div>
          <h1 class="admin-crud-page__title">公共配置</h1>
          <p class="public-config-page__subtitle">维护 C 端可以免登录按键读取的非敏感配置。</p>
        </div>
        <el-button type="primary" @click="formDialogRef?.open('add')">新增配置</el-button>
      </header>
      <data-filter-panel
        :model-value="filters"
        :default-model="ADMIN_PUBLIC_CONFIG_FILTER_MODEL"
        :config="ADMIN_PUBLIC_CONFIG_FILTER_CONFIG"
        @update:model-value="handleFilterUpdate"
        @search="handleSearch"
        @reset="handleReset"
      />
      <div class="admin-crud-page__table">
        <el-table v-loading="loading" class="admin-table" :data="configList" height="100%">
          <el-table-column label="序号" min-width="76" align="center">
            <template #default="{ $index }">{{ (filters.pageNum - 1) * filters.pageSize + $index + 1 }}</template>
          </el-table-column>
          <el-table-column prop="key" label="配置键" min-width="220">
            <template #default="{ row }"
              ><code class="public-config-page__key">{{ row.key }}</code></template
            >
          </el-table-column>
          <el-table-column prop="value" label="配置值" min-width="260" show-overflow-tooltip />
          <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.description || '-' }}</template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" min-width="180">
            <template #default="{ row }">{{ formatAdminDateTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="formDialogRef?.open('edit', row as AdminPublicConfigListItem)"
                >编辑</el-button
              >
              <el-button
                link
                type="danger"
                :loading="deletingId === row.id"
                @click="handleDelete(row as AdminPublicConfigListItem)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
          <template #empty><base-empty-state description="暂无公共配置" layout="inline" :image-size="84" /></template>
        </el-table>
      </div>
      <footer class="admin-crud-page__pagination">
        <el-pagination
          background
          :page-sizes="pageSizeOptions"
          :current-page="filters.pageNum"
          :page-size="filters.pageSize"
          :total="total"
          layout="total,sizes,prev,pager,next,jumper"
          @current-change="handlePageNumChange"
          @size-change="handlePageSizeChange"
        />
      </footer>
    </section>
    <public-config-form-dialog ref="formDialogRef" @success="handleFormSuccess" />
  </section>
</template>

<script setup lang="ts">
import DataFilterPanel from '@/components/business/data-filter-panel/index.vue';
import {
  ADMIN_PAGE_SIZE_OPTIONS,
  ADMIN_PUBLIC_CONFIG_FILTER_CONFIG,
  ADMIN_PUBLIC_CONFIG_FILTER_MODEL,
} from '@/constants';
import { formatAdminDateTime } from '@/utils';
import PublicConfigFormDialog from './components/public-config-form-dialog/index.vue';
import { usePublicConfigManagement } from './composables/use-public-config-management';

import type { AdminPublicConfigListItem } from '@repo/shared/types';

const formDialogRef = useTemplateRef<InstanceType<typeof PublicConfigFormDialog>>('formDialogRef');
const pageSizeOptions = [...ADMIN_PAGE_SIZE_OPTIONS];
const {
  loading,
  deletingId,
  filters,
  configList,
  total,
  handleFilterUpdate,
  handleSearch,
  handleReset,
  handlePageNumChange,
  handlePageSizeChange,
  handleDelete,
  handleFormSuccess,
} = usePublicConfigManagement();
</script>

<style lang="scss" scoped>
.public-config-page {
  &__subtitle {
    margin-top: 4px;
    color: var(--color-text-tertiary);
    font-size: 12px;
  }

  &__key {
    color: var(--color-text-secondary);
    font-family: 'Roboto Mono', Consolas, monospace;
    font-size: 12px;
  }
}
</style>
