import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService, SessionContext } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RevokeDto } from './dto/revoke.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getContext(req: Request): SessionContext {
    return {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      device: req.headers['x-device-id'] as string,
    };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.getContext(req));
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.getContext(req));
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() dto: RevokeDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('oauth')
  async oauthLogin(@Body() body: { email: string; name: string; providerId: string }) {
    return this.authService.validateOAuthUser(body.email, body.name, body.providerId);
  }

  // Stubs for future flows
  @Post('reset-password-request')
  async requestPasswordReset(@Body('email') email: string) {
    // Stub
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  async resetPassword(@Body('token') token: string, @Body('newPassword') newPassword: string) {
    // Stub
    return { message: 'Password has been reset successfully.' };
  }

  @Post('mfa/enable')
  async enableMfa(@Body('userId') userId: string) {
    // Stub
    return { secret: 'dummy-secret', qrCode: 'dummy-qr-url' };
  }

  @Post('mfa/verify')
  async verifyMfa(@Body('userId') userId: string, @Body('token') token: string) {
    // Stub
    return { valid: true };
  }
}
