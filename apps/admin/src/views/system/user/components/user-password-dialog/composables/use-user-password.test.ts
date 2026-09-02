import { beforeEach, describe, expect, it, rstest } from '@rstest/core';

import { resetAdminUserPassword } from '@/api';
import { withSetup } from '@tests/with-setup';
import { useUserPassword } from './use-user-password';

import type { FormInstance } from 'element-plus';
import type { AdminUserListItem } from '@repo/shared/types';

rstest.mock('@/api', () => ({
  resetAdminUserPassword: rstest.fn(),
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
 * @returns 满足 Shared 契约的用户记录
 */
const createUserItem = (): AdminUserListItem => {
  return {
    id: 11,
    username: 'operator',
    displayName: '运营专员',
    isActive: true,
    isSystem: false,
    roles: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
};

/**
 * 在组件上下文中挂载密码重置表单并注入表单实例替身
 *
 * @param valid 表单校验是否通过
 * @returns 表单 Composable 返回值与卸载句柄
 */
const mountPasswordDialog = (valid: boolean): [ReturnType<typeof useUserPassword>, () => void] => {
  return withSetup(() => {
    const result = useUserPassword();
    getCurrentInstance()!.refs.formRef = createFakeFormInstance(valid);

    return result;
  });
};

describe('用户密码重置弹框', () => {
  beforeEach(() => {
    rstest.resetAllMocks();
  });

  it('打开弹框时清空上一条敏感输入', () => {
    const [dialog] = mountPasswordDialog(true);

    dialog.open(createUserItem());
    dialog.form.password = 'oldPassword123';
    dialog.form.confirmPassword = 'oldPassword123';
    dialog.handleCancel();

    dialog.open(createUserItem());
    expect(dialog.form.password).toBe('');
    expect(dialog.form.confirmPassword).toBe('');
    expect(dialog.dialogVisible.value).toBe(true);
    expect(dialog.targetUser.value?.id).toBe(11);
  });

  it('表单校验失败时不发起重置请求', async () => {
    const [dialog] = mountPasswordDialog(false);

    dialog.open(createUserItem());
    dialog.form.password = 'newPassword123';
    await dialog.handleSubmit();

    expect(resetAdminUserPassword).not.toHaveBeenCalled();
    expect(dialog.submitting.value).toBe(false);
  });

  it('重置成功后清空密码并关闭弹框', async () => {
    rstest.mocked(resetAdminUserPassword).mockResolvedValue(undefined);
    const [dialog] = mountPasswordDialog(true);

    dialog.open(createUserItem());
    dialog.form.password = 'newPassword123';
    dialog.form.confirmPassword = 'newPassword123';
    await dialog.handleSubmit();

    expect(resetAdminUserPassword).toHaveBeenCalledWith(11, { password: 'newPassword123' });
    expect(dialog.dialogVisible.value).toBe(false);
    // 成功后立即清空敏感字段，避免留在内存与 DOM 中
    expect(dialog.form.password).toBe('');
    expect(dialog.form.confirmPassword).toBe('');
  });

  it('取消弹框时清空敏感输入', () => {
    const [dialog] = mountPasswordDialog(true);

    dialog.open(createUserItem());
    dialog.form.password = 'typedPassword';
    dialog.form.confirmPassword = 'typedPassword';
    dialog.handleCancel();

    expect(dialog.dialogVisible.value).toBe(false);
    expect(dialog.form.password).toBe('');
    expect(dialog.form.confirmPassword).toBe('');
  });

  it('重置失败保留输入供管理员修正', async () => {
    rstest.mocked(resetAdminUserPassword).mockRejectedValue(new Error('密码策略不满足'));
    const [dialog] = mountPasswordDialog(true);

    dialog.open(createUserItem());
    dialog.form.password = 'weakPassword';
    dialog.form.confirmPassword = 'weakPassword';
    await dialog.handleSubmit();

    expect(dialog.dialogVisible.value).toBe(true);
    expect(dialog.form.password).toBe('weakPassword');
    expect(dialog.submitting.value).toBe(false);
  });

  it('提交进行中时拒绝重复提交', async () => {
    let resolveReset!: () => void;
    rstest.mocked(resetAdminUserPassword).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveReset = resolve;
        }),
    );
    const [dialog] = mountPasswordDialog(true);

    dialog.open(createUserItem());
    dialog.form.password = 'newPassword123';
    dialog.form.confirmPassword = 'newPassword123';

    const firstSubmit = dialog.handleSubmit();
    await rstest.waitFor(() => expect(dialog.submitting.value).toBe(true));

    await dialog.handleSubmit();
    expect(resetAdminUserPassword).toHaveBeenCalledTimes(1);

    resolveReset();
    await firstSubmit;
    expect(dialog.submitting.value).toBe(false);
  });
});
