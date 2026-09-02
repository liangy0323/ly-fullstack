<template>
  <section class="role-management-page admin-crud-page">
    <section class="admin-crud-page__workspace">
      <header class="admin-crud-page__header">
        <h1 class="admin-crud-page__title">角色管理</h1>
        <el-button type="primary" @click="handleRoleCreate">新增角色</el-button>
      </header>

      <data-filter-panel
        :model-value="filters"
        :default-model="ADMIN_ROLE_FILTER_MODEL"
        :config="ADMIN_ROLE_FILTER_CONFIG"
        @update:model-value="handleFilterUpdate"
        @search="handleSearch"
        @reset="handleReset"
      />

      <div class="admin-crud-page__table">
        <el-table v-loading="loading" class="admin-table" :data="roleList" height="100%">
          <el-table-column label="序号" min-width="76" align="center">
            <template #default="{ $index }">
              {{ (filters.pageNum - 1) * filters.pageSize + $index + 1 }}
            </template>
          </el-table-column>

          <el-table-column prop="name" label="角色名称" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="role-management-page__name">{{ row.name }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="code" label="角色编码" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">
              <code class="role-management-page__code">{{ row.code }}</code>
            </template>
          </el-table-column>

          <el-table-column label="角色类型" min-width="110" align="center">
            <template #default="{ row }">
              <base-badge :tone="row.isSystem ? 'primary' : 'neutral'">
                {{ row.isSystem ? '系统内置' : '普通角色' }}
              </base-badge>
            </template>
          </el-table-column>

          <el-table-column prop="description" label="角色说明" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </el-table-column>

          <el-table-column prop="userCount" label="用户数" min-width="90" align="center" />
          <el-table-column label="权限数" min-width="90" align="center">
            <template #default="{ row }">
              {{ row.isSystem ? '全部' : row.menuCount }}
            </template>
          </el-table-column>

          <el-table-column label="状态" min-width="100" align="center">
            <template #default="{ row }">
              <base-badge :tone="row.isActive ? 'success' : 'warning'" dot>
                {{ row.isActive ? '启用' : '停用' }}
              </base-badge>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="创建时间" min-width="180">
            <template #default="{ row }">
              <span class="role-management-page__time">{{ formatAdminDateTime(row.createdAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <template v-if="!row.isSystem">
                <el-button link type="primary" @click="handleRoleMenus(row as AdminRoleListItem)">菜单权限</el-button>
                <el-button link type="primary" @click="handleRoleEdit(row as AdminRoleListItem)">编辑</el-button>
                <el-button
                  link
                  type="danger"
                  :loading="deletingId === row.id"
                  :disabled="Boolean(deletingId)"
                  @click="handleRoleDelete(row as AdminRoleListItem)"
                >
                  删除
                </el-button>
              </template>
              <span v-else class="role-management-page__protected">不可修改</span>
            </template>
          </el-table-column>

          <template #empty>
            <base-empty-state description="暂无角色数据" layout="inline" :image-size="84" />
          </template>
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

    <role-form-dialog ref="formDialogRef" @success="handleFormSuccess" />
    <role-menu-permission-dialog ref="menuPermissionDialogRef" @success="reload" />
  </section>
</template>

<script setup lang="ts">
import DataFilterPanel from '@/components/business/data-filter-panel/index.vue';
import { ADMIN_PAGE_SIZE_OPTIONS, ADMIN_ROLE_FILTER_CONFIG, ADMIN_ROLE_FILTER_MODEL } from '@/constants';
import { formatAdminDateTime } from '@/utils';
import RoleFormDialog from './components/role-form-dialog/index.vue';
import RoleMenuPermissionDialog from './components/role-menu-permission-dialog/index.vue';
import { useRoleManagement } from './composables/use-role-management';

import type { AdminRoleListItem } from '@repo/shared/types';

const formDialogRef = useTemplateRef<InstanceType<typeof RoleFormDialog>>('formDialogRef');
const menuPermissionDialogRef =
  useTemplateRef<InstanceType<typeof RoleMenuPermissionDialog>>('menuPermissionDialogRef');
const pageSizeOptions = [...ADMIN_PAGE_SIZE_OPTIONS];

const {
  loading,
  deletingId,
  filters,
  roleList,
  total,
  reload,
  handleFilterUpdate,
  handleSearch,
  handleReset,
  handlePageNumChange,
  handlePageSizeChange,
  handleRoleDelete,
  handleFormSuccess,
} = useRoleManagement();

const handleRoleCreate = (): void => {
  formDialogRef.value?.open('add');
};

/**
 * 打开普通角色编辑弹框
 *
 * @param role 当前表格行
 */
const handleRoleEdit = (role: AdminRoleListItem): void => {
  formDialogRef.value?.open('edit', role);
};

/**
 * 打开普通角色菜单权限弹框
 *
 * @param role 当前表格行
 */
const handleRoleMenus = (role: AdminRoleListItem): void => {
  void menuPermissionDialogRef.value?.open(role);
};
</script>

<style lang="scss" scoped>
.role-management-page {
  &__name {
    color: var(--color-text-primary);
    font-weight: 500;
  }

  &__code {
    color: var(--color-text-secondary);
    font-family: 'Roboto Mono', Consolas, monospace;
    font-size: 12px;
  }

  &__time,
  &__protected {
    color: var(--color-text-tertiary);
    font-size: 12px;
  }

  &__time {
    font-variant-numeric: tabular-nums;
  }
}
</style>
