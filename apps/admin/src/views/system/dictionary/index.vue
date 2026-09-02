<template>
  <section class="dictionary-management-page admin-crud-page">
    <section class="admin-crud-page__workspace">
      <header class="admin-crud-page__header">
        <h1 class="admin-crud-page__title">字典管理</h1>
        <el-button type="primary" @click="formDialogRef?.open('add')">新增字典</el-button>
      </header>
      <data-filter-panel
        :model-value="filters"
        :default-model="ADMIN_DICTIONARY_FILTER_MODEL"
        :config="ADMIN_DICTIONARY_FILTER_CONFIG"
        @update:model-value="handleFilterUpdate"
        @search="handleSearch"
        @reset="handleReset"
      />
      <div class="admin-crud-page__table">
        <el-table v-loading="loading" class="admin-table" :data="dictionaryList" height="100%">
          <el-table-column label="序号" min-width="76" align="center">
            <template #default="{ $index }">{{ (filters.pageNum - 1) * filters.pageSize + $index + 1 }}</template>
          </el-table-column>
          <el-table-column prop="name" label="字典名称" min-width="150" />
          <el-table-column prop="code" label="字典编码" min-width="180">
            <template #default="{ row }"
              ><code class="dictionary-management-page__code">{{ row.code }}</code></template
            >
          </el-table-column>
          <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.description || '-' }}</template>
          </el-table-column>
          <el-table-column prop="itemCount" label="字典项" min-width="90" align="center" />
          <el-table-column label="状态" min-width="100" align="center">
            <template #default="{ row }">
              <base-badge :tone="row.isActive ? 'success' : 'warning'" dot>
                {{ row.isActive ? '启用' : '停用' }}
              </base-badge>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="180">
            <template #default="{ row }">{{ formatAdminDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="itemDialogRef?.open(row as AdminDictionaryListItem)"
                >字典项</el-button
              >
              <el-button link type="primary" @click="formDialogRef?.open('edit', row as AdminDictionaryListItem)"
                >编辑</el-button
              >
              <el-button
                link
                type="danger"
                :loading="deletingId === row.id"
                @click="handleDictionaryDelete(row as AdminDictionaryListItem)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
          <template #empty><base-empty-state description="暂无字典数据" layout="inline" :image-size="84" /></template>
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
    <dictionary-form-dialog ref="formDialogRef" @success="handleFormSuccess" />
    <dictionary-item-dialog ref="itemDialogRef" @change="reload" />
  </section>
</template>

<script setup lang="ts">
import DataFilterPanel from '@/components/business/data-filter-panel/index.vue';
import { ADMIN_DICTIONARY_FILTER_CONFIG, ADMIN_DICTIONARY_FILTER_MODEL, ADMIN_PAGE_SIZE_OPTIONS } from '@/constants';
import { formatAdminDateTime } from '@/utils';
import DictionaryFormDialog from './components/dictionary-form-dialog/index.vue';
import DictionaryItemDialog from './components/dictionary-item-dialog/index.vue';
import { useDictionaryManagement } from './composables/use-dictionary-management';

import type { AdminDictionaryListItem } from '@repo/shared/types';

const formDialogRef = useTemplateRef<InstanceType<typeof DictionaryFormDialog>>('formDialogRef');
const itemDialogRef = useTemplateRef<InstanceType<typeof DictionaryItemDialog>>('itemDialogRef');
const pageSizeOptions = [...ADMIN_PAGE_SIZE_OPTIONS];
const {
  loading,
  deletingId,
  filters,
  dictionaryList,
  total,
  reload,
  handleFilterUpdate,
  handleSearch,
  handleReset,
  handlePageNumChange,
  handlePageSizeChange,
  handleDictionaryDelete,
  handleFormSuccess,
} = useDictionaryManagement();
</script>

<style lang="scss" scoped>
.dictionary-management-page__code {
  color: var(--color-text-secondary);
  font-family: 'Roboto Mono', Consolas, monospace;
  font-size: 12px;
}
</style>
