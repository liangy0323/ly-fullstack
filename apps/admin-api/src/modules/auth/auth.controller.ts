import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Post, Put, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import type { AdminCaptchaResponse, AdminLoginResponse, AdminSession } from '@repo/shared/types';

import { AdminJwtGuard, createDtoValidationPipe, CurrentAdmin } from '../../common';
import { ADMIN_CAPTCHA_RATE_LIMIT, ADMIN_LOGIN_RATE_TTL_MS, ADMIN_LOGIN_THROTTLER_NAME } from '../../constants';
import type { AuthenticatedAdmin } from '../../types';
import { AuthCaptchaService } from './auth-captcha.service';
import { AuthService } from './auth.service';
import { AdminCaptchaVerifyDto } from './dto/admin-captcha-verify.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';

/**
 * 管理端登录与当前会话 Controller
 *
 * 登录接口公开访问；当前会话接口必须先经过 JWT Guard。Controller 只负责 HTTP 参数和响应映射，
 * 密码校验、Token 签发与 RBAC 查询全部留在 Service 层。
 */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AuthCaptchaService) private readonly authCaptchaService: AuthCaptchaService,
  ) {}

  /**
   * 创建管理端登录图片滑块挑战
   *
   * 响应只包含已绘制缺口的背景图、拼图块和一次性编号，正确横坐标保留在
   * Admin API 进程内，不下发给浏览器。
   *
   * @param e2eMarker Playwright 在非生产环境进行真实拖动时使用的请求标记
   * @returns 可供登录弹框展示的一次性图片挑战
   */
  @Get('captcha')
  @Throttle({
    [ADMIN_LOGIN_THROTTLER_NAME]: { limit: ADMIN_CAPTCHA_RATE_LIMIT, ttl: ADMIN_LOGIN_RATE_TTL_MS },
  })
  @UseGuards(ThrottlerGuard)
  createCaptcha(@Headers('x-ly-e2e-captcha') e2eMarker?: string): Promise<AdminCaptchaResponse> {
    const exposeTestOffset = process.env.APP_ENV === 'test' && e2eMarker === 'playwright';
    return this.authCaptchaService.createCaptcha(exposeTestOffset);
  }

  /**
   * 校验用户拖动的拼图位置
   *
   * 每个挑战只能提交一次。校验成功后挑战会变成待登录消费凭证；失败时直接作废，
   * 客户端必须重新获取图片。
   *
   * @param dto 挑战编号和用户实际拖动偏移量
   */
  @Post('captcha/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({
    [ADMIN_LOGIN_THROTTLER_NAME]: { limit: ADMIN_CAPTCHA_RATE_LIMIT, ttl: ADMIN_LOGIN_RATE_TTL_MS },
  })
  @UseGuards(ThrottlerGuard)
  verifyCaptcha(@Body(createDtoValidationPipe(AdminCaptchaVerifyDto)) dto: AdminCaptchaVerifyDto): void {
    this.authCaptchaService.verifyCaptcha(dto.captchaId, dto.offset);
  }

  /**
   * 使用管理员账号和密码登录
   *
   * @param dto 已通过字段白名单、长度和类型校验的登录参数
   * @returns Access Token 和当前管理员 RBAC 会话
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  login(@Body(createDtoValidationPipe(AdminLoginDto)) dto: AdminLoginDto): Promise<AdminLoginResponse> {
    return this.authService.login(dto);
  }

  /**
   * 获取数据库最新的当前管理员会话
   *
   * JWT Guard 已经完成验签和数据库状态复查，此处只把内部访问上下文映射为 Shared HTTP 契约，
   * 不暴露密码哈希和 Prisma 关联记录。
   *
   * @param admin JWT Guard 写入请求的当前管理员访问上下文
   * @returns 管理员资料、可见菜单树和权限码
   */
  @Get('me')
  @UseGuards(AdminJwtGuard)
  getCurrentSession(@CurrentAdmin() admin: AuthenticatedAdmin): AdminSession {
    return {
      user: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        roles: admin.roles,
      },
      menus: admin.menus,
      permissions: admin.permissions,
    };
  }

  /**
   * 修改当前管理员的登录密码
   *
   * JWT Guard 先确认当前会话仍然有效，认证服务再比较请求中的当前密码，避免仅凭已登录页面直接覆盖密码。
   *
   * @param dto 当前密码和新密码
   * @param admin JWT Guard 写入的当前管理员访问上下文
   */
  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtGuard)
  changePassword(
    @Body(createDtoValidationPipe(ChangeAdminPasswordDto)) dto: ChangeAdminPasswordDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<void> {
    return this.authService.changePassword(admin.id, dto);
  }
}
