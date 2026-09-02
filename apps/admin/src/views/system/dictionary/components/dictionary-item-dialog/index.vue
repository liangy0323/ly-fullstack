<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`${dictionary?.name ?? ''} · 字典项`"
    width="min(980px, calc(100vw - 32px))"
    modal-class="dialog-custom-common"
    header-class="dialog-custom-header"
    align-center
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="dictionary-item-dialog">
      <div class="dictionary-item-dialog__toolbar">
        <el-input v-model="filters.keyword" clearable placeholder="搜索展示文本或字典值" @keyup.enter="loadItems" />
        <el-select v-model="filters.status" clearable placeholder="全部状态">
          <el-option label="启用" value="ACTIVE" />
          <el-option label="停用" value="INACTIVE" />
        </el-select>
        <el-button type="primary" @click="loadItems">查询</el-button>
        <el-button @click="openForm('add')">新增字典项</el-button>
      </div>
      <el-table v-loading="loading" class="admin-table" :data="itemList" height="400">
        <el-table-column prop="label" label="展示文本" min-width="140" />
        <el-table-column prop="value" label="字典值" min-width="160" show-overflow-tooltip />
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" min-width="80" align="center" />
        <el-table-column label="状态" min-width="90" align="center">
          <template #default="{ row }">
            <base-badge :tone="row.isActive ? 'success' : 'warning'" dot>
              {{ row.isActive ? '启用' : '停用' }}
            </base-badge>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm('edit', row as AdminDictionaryItemListItem)"
              >编辑</el-button
            >
            <el-button
              link
              type="danger"
              :loading="deletingId === row.id"
              @click="handleDelete(row as AdminDictionaryItemListItem)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <base-empty-state description="暂无字典项" layout="inline" :image-size="72" />
        </template>
      </el-table>
      <div class="dictionary-item-dialog__pagination">
        <el-pagination
          background
          :current-page="filters.pageNum"
          :page-size="filters.pageSize"
          :total="total"
          layout="total,prev,pager,next"
          @current-change="
            (page: number) => {
              filters.pageNum = page;
              loadItems();
            }
          "
        />
      </div>
    </div>

    <el-dialog
      v-model="formDialogVisible"
      :title="operationType === 'add' ? '新增字典项' : '编辑字典项'"
      width="min(520px, calc(100vw - 32px))"
      append-to-body
      modal-class="dialog-custom-common"
      header-class="dialog-custom-header"
      align-center
    >
      <div class="dictionary-item-dialog__form">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="展示文本" prop="label">
            <el-input v-model="form.label" maxlength="50" show-word-limit />
          </el-form-item>
          <el-form-item label="字典值" prop="value">
            <el-input v-model="form.value" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="form.description" type="textarea" :rows="2" maxlength="200" show-word-limit />
          </el-form-item>
          <div class="dictionary-item-dialog__form-row">
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="form.isActive" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </div>
        </el-form>
      </div>
      <template #footer>
        <div class="dictionary-item-dialog__form-footer">
          <el-button :disabled="submitting" @click="formDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { useDictionaryItems } from './composables/use-dictionary-items';

import type { AdminDictionaryItemListItem, AdminDictionaryListItem } from '@repo/shared/types';

const emits = defineEmits<{ change: [] }>();

const {
  dialogVisible,
  formDialogVisible,
  loading,
  submitting,
  deletingId,
  changed,
  dictionary,
  itemList,
  total,
  filters,
  operationType,
  formRef,
  form,
  rules,
  open,
  openForm,
  loadItems,
  handleSubmit,
  handleDelete,
} = useDictionaryItems();

const handleClosed = (): void => {
  if (changed.value) {
    emits('change');
  }
};

defineExpose({ open: (record: AdminDictionaryListItem) => open(record) });
</script>

<style lang="scss" scoped>
.dictionary-item-dialog {
  padding: var(--spacing-xl);

  &__toolbar {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) 150px auto auto;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--spacing-md);
  }

  &__form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
  }

  &__form {
    padding: var(--spacing-xl);
  }

  &__form-footer {
    display: flex;
    min-height: 64px;
    align-items: center;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding: 0 var(--spacing-xl);
    border-top: 1px solid var(--border-color);
  }
}
</style>
