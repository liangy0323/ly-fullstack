import { beforeEach, describe, expect, it, rstest } from '@rstest/core';

import { createAdminUser, updateAdminUser } from '@/api';
import { withSetup } from '@tests/with-setup';
import { useUserForm } from './use-user-form';

import type { FormInstance } from 'element-plus';
import type { AdminUserListItem } from '@repo/shared/types';
import type { OperationType, UseUserFormOptions } from '@/types';

rstest.mock('@/api', () => ({
  createAdminUser: rstest.fn(),
  updateAdminUser: rstest.fn(),
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
 * 构造用户列表记录夹具
 *
 * @param overrides 需要覆盖的字段
 * @returns 满足 Shared 契约的用户记录
 */
const createUserItem = (overrides: Partial<AdminUserListItem> = {}): AdminUserListItem => {
  return {
    id: 7,
    username: 'operator',
    displayName: '运营专员',
    isActive: true,
    isSystem: false,
    roles: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
};

/**
 * 在组件上下文中挂载用户表单并注入表单实例替身
 *
 * `useTemplateRef` 返回只读引用，测试通过组件实例 refs 的写入通道注入替身。
 *
 * @param valid 表单校验是否通过
 * @param onSuccess 保存成功回调
 * @returns 表单 Composable 返回值与卸载句柄
 */
const mountUserForm = (
  valid: boolean,
  onSuccess: UseUserFormOptions['onSuccess'] = rstest.fn(),
): [ReturnType<typeof useUserForm>, () => void] => {
  return withSetup(() => {
    const result = useUserForm({ onSuccess });
    getCurrentInstance()!.refs.formRef = createFakeFormInstance(valid);

    return result;
  });
};

describe('用户新增与编辑表单', () => {
  beforeEach(() => {
    rstest.resetAllMocks();
  });

  it('编辑后再新增时表单重置为默认值，不残留上一条数据', () => {
    const [form] = mountUserForm(true);

    form.open('edit', createUserItem());
    expect(form.form.username).toBe('operator');

    form.handleCancel();
    form.open('add');
    expect(form.dialogVisible.value).toBe(true);
    expect(form.operationType.value).toBe('add');
    expect(form.form.username).toBe('');
    expect(form.form.password).toBe('');
    expect(form.form.displayName).toBe('');
    expect(form.form.isActive).toBe(true);
  });

  it('编辑模式填充目标用户数据且登录名回显', () => {
    const [form] = mountUserForm(true);

    form.open('edit', createUserItem({ displayName: null, isActive: false }));

    expect(form.operationType.value).toBe('edit');
    expect(form.dialogTitle.value).toBe('编辑用户');
    expect(form.form.username).toBe('operator');
    expect(form.form.displayName).toBe('');
    expect(form.form.isActive).toBe(false);
  });

  it('表单校验失败时不发起提交请求', async () => {
    const [form] = mountUserForm(false);

    form.open('add');
    form.form.username = 'new_operator';
    form.form.password = 'password123';
    await form.handleSubmit();

    expect(createAdminUser).not.toHaveBeenCalled();
    expect(form.submitting.value).toBe(false);
    expect(form.dialogVisible.value).toBe(true);
  });

  it('新增成功关闭弹框并通知页面刷新', async () => {
    const onSuccess = rstest.fn<(...args: OperationType[]) => void>();
    rstest.mocked(createAdminUser).mockResolvedValue(createUserItem());
    const [form] = mountUserForm(true, onSuccess);

    form.open('add');
    form.form.username = 'new_operator';
    form.form.password = 'password123';
    form.form.displayName = '新运营';
    await form.handleSubmit();

    expect(createAdminUser).toHaveBeenCalledWith({
      username: 'new_operator',
      password: 'password123',
      displayName: '新运营',
      isActive: true,
    });
    expect(form.dialogVisible.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith('add');
    expect(form.submitting.value).toBe(false);
  });

  it('编辑成功只提交显示名称与状态', async () => {
    const onSuccess = rstest.fn();
    rstest.mocked(updateAdminUser).mockResolvedValue(createUserItem());
    const [form] = mountUserForm(true, onSuccess);

    form.open('edit', createUserItem());
    form.form.displayName = '改名运营';
    form.form.isActive = false;
    await form.handleSubmit();

    expect(updateAdminUser).toHaveBeenCalledWith(7, { displayName: '改名运营', isActive: false });
    expect(createAdminUser).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith('edit');
    expect(form.dialogVisible.value).toBe(false);
  });

  it('提交失败保持弹框打开并恢复提交状态，不通知页面刷新', async () => {
    const onSuccess = rstest.fn();
    rstest.mocked(createAdminUser).mockRejectedValue(new Error('登录名已存在'));
    const [form] = mountUserForm(true, onSuccess);

    form.open('add');
    form.form.username = 'conflict_user';
    form.form.password = 'password123';
    await form.handleSubmit();

    expect(form.submitting.value).toBe(false);
    // 失败时保留输入供管理员修正后重试
    expect(form.dialogVisible.value).toBe(true);
    expect(form.form.username).toBe('conflict_user');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('提交进行中时拒绝重复提交，且提交中不允许取消关闭', async () => {
    rstest.mocked(createAdminUser).mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('slow')), 50);
        }),
    );
    const [form] = mountUserForm(true);

    form.open('add');
    form.form.username = 'slow_user';
    form.form.password = 'password123';

    const firstSubmit = form.handleSubmit();
    await rstest.waitFor(() => expect(form.submitting.value).toBe(true));

    await form.handleSubmit();
    expect(createAdminUser).toHaveBeenCalledTimes(1);

    form.handleCancel();
    expect(form.dialogVisible.value).toBe(true);

    await firstSubmit;
    expect(form.submitting.value).toBe(false);
  });
});
