import { beforeEach, describe, expect, it, rstest } from '@rstest/core';

import { createAdminRole, updateAdminRole } from '@/api';
import { withSetup } from '@tests/with-setup';
import { useRoleForm } from './use-role-form';

import type { FormInstance } from 'element-plus';
import type { AdminRoleDetail, AdminRoleListItem } from '@repo/shared/types';
import type { UseRoleFormOptions } from '@/types';

rstest.mock('@/api', () => ({
  createAdminRole: rstest.fn(),
  updateAdminRole: rstest.fn(),
}));

rstest.mock('element-plus', () => ({
  ElMessage: { success: rstest.fn() },
}));

/**
 * 构造 Element Plus 表单实例替身
 *
 * @param valid validate 是否通过
 * @returns 仅实现被测 Composable 依赖的 validate 与 clearValidate
 */
const createFakeFormInstance = (valid: boolean): FormInstance => {
  return {
    validate: valid ? rstest.fn().mockResolvedValue(true) : rstest.fn().mockRejectedValue(new Error('校验失败')),
    clearValidate: rstest.fn(),
  } as unknown as FormInstance;
};

/**
 * 构造角色列表记录夹具
 *
 * @param overrides 需要覆盖的字段
 * @returns 满足 Shared 契约的角色记录
 */
const createRoleItem = (overrides: Partial<AdminRoleListItem> = {}): AdminRoleListItem => {
  return {
    id: 5,
    name: '内容编辑',
    code: 'content_editor',
    description: '负责内容维护',
    isActive: true,
    isSystem: false,
    userCount: 2,
    menuCount: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
};

/**
 * 在组件上下文中挂载角色表单并注入表单实例替身
 *
 * @param valid 表单校验是否通过
 * @param onSuccess 保存成功回调
 * @returns 表单 Composable 返回值与卸载句柄
 */
const mountRoleForm = (
  valid: boolean,
  onSuccess: UseRoleFormOptions['onSuccess'] = rstest.fn(),
): [ReturnType<typeof useRoleForm>, () => void] => {
  return withSetup(() => {
    const result = useRoleForm({ onSuccess });
    getCurrentInstance()!.refs.formRef = createFakeFormInstance(valid);

    return result;
  });
};

describe('角色新增与编辑表单', () => {
  beforeEach(() => {
    rstest.resetAllMocks();
  });

  it('编辑后再新增时表单重置为默认值，不残留上一条数据', () => {
    const [form] = mountRoleForm(true);

    form.open('edit', createRoleItem());
    expect(form.form.code).toBe('content_editor');

    form.handleCancel();
    form.open('add');
    expect(form.form.name).toBe('');
    expect(form.form.code).toBe('');
    expect(form.form.description).toBe('');
    expect(form.form.isActive).toBe(true);
    expect(form.dialogTitle.value).toBe('新增角色');
  });

  it('编辑模式填充目标角色数据', () => {
    const [form] = mountRoleForm(true);

    form.open('edit', createRoleItem({ description: null, isActive: false }));

    expect(form.dialogTitle.value).toBe('编辑角色');
    expect(form.form.name).toBe('内容编辑');
    expect(form.form.code).toBe('content_editor');
    expect(form.form.description).toBe('');
    expect(form.form.isActive).toBe(false);
  });

  it('新增成功提交完整参数并关闭弹框', async () => {
    const onSuccess = rstest.fn();
    rstest.mocked(createAdminRole).mockResolvedValue({ ...createRoleItem(), menuIds: [] });
    const [form] = mountRoleForm(true, onSuccess);

    form.open('add');
    form.form.name = '运营专员';
    form.form.code = 'operations';
    form.form.description = '日常运营';
    await form.handleSubmit();

    expect(createAdminRole).toHaveBeenCalledWith({
      name: '运营专员',
      code: 'operations',
      description: '日常运营',
      isActive: true,
    });
    expect(form.dialogVisible.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith('add');
  });

  it('编辑成功不提交角色编码', async () => {
    rstest.mocked(updateAdminRole).mockResolvedValue({ ...createRoleItem(), menuIds: [] });
    const [form] = mountRoleForm(true);

    form.open('edit', createRoleItem());
    form.form.name = '内容主编';
    await form.handleSubmit();

    expect(updateAdminRole).toHaveBeenCalledWith(5, { name: '内容主编', description: '负责内容维护', isActive: true });
    expect(createAdminRole).not.toHaveBeenCalled();
  });

  it('提交失败保持弹框打开并恢复提交状态', async () => {
    rstest.mocked(createAdminRole).mockRejectedValue(new Error('角色编码已存在'));
    const [form] = mountRoleForm(true);

    form.open('add');
    form.form.name = '冲突角色';
    form.form.code = 'conflict';
    await form.handleSubmit();

    expect(form.submitting.value).toBe(false);
    expect(form.dialogVisible.value).toBe(true);
    expect(form.form.code).toBe('conflict');
  });

  it('提交进行中时拒绝重复提交', async () => {
    let resolveCreate!: (value: AdminRoleDetail) => void;
    rstest.mocked(createAdminRole).mockImplementationOnce(
      () =>
        new Promise<AdminRoleDetail>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const [form] = mountRoleForm(true);

    form.open('add');
    form.form.name = '慢角色';
    form.form.code = 'slow_role';

    const firstSubmit = form.handleSubmit();
    await rstest.waitFor(() => expect(form.submitting.value).toBe(true));

    await form.handleSubmit();
    expect(createAdminRole).toHaveBeenCalledTimes(1);

    resolveCreate({ ...createRoleItem(), menuIds: [] });
    await firstSubmit;
    expect(form.submitting.value).toBe(false);
  });
});
