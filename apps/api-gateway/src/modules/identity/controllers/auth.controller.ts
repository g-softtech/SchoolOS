import { Controller, Post, Patch, Body, Ip, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticationService } from '../services/authentication.service';
import { RegistrationService } from '../services/registration.service';
import { SessionService } from '../services/session.service';
import { PasswordService } from '../services/password.service';
import { RegisterUserDto, LoginDto, ApiResponseDto } from '../dto/auth.dto';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly registrationService: RegistrationService,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new global user account' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  async register(@Body() dto: RegisterUserDto): Promise<ApiResponseDto<{ accessToken: string, refreshToken: string }>> {
    const result = await this.registrationService.register(dto);
    return {
      success: true,
      data: { accessToken: result.accessToken, refreshToken: result.refreshToken }
    };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate and receive a JWT' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Ip() ip: string): Promise<ApiResponseDto<{ accessToken: string, refreshToken: string }>> {
    const result = await this.authService.login(dto, ip);
    return {
      success: true,
      data: { accessToken: result.accessToken, refreshToken: result.refreshToken }
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token' })
  async refresh(@Body('refreshToken') token: string): Promise<ApiResponseDto<{ accessToken: string, refreshToken: string }>> {
    const result = await this.sessionService.rotateRefreshToken(token);
    return { success: true, data: result };
  }

  @Patch('password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  async changePassword(
    @Body() dto: any, 
    @CurrentUser('sub') globalUserId: string
  ): Promise<ApiResponseDto<{ success: boolean }>> {
    await this.passwordService.changePassword(globalUserId, dto.oldPassword, dto.newPassword);
    return { success: true, data: { success: true } };
  }
}
