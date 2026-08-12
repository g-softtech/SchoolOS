import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticationException , SessionState } from '@saas/core-platform';

export interface SessionContext {
  ip?: string;
  userAgent?: string;
  device?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new AuthenticationException('EMAIL_IN_USE', 'Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
      },
    });

    // Domain Event
    this.eventEmitter.emit('Identity.UserRegistered', { userId: user.id, email: user.email });
    // Audit Event
    this.eventEmitter.emit('AUTH_USER_REGISTERED', { userId: user.id });

    return { id: user.id, email: user.email };
  }

  async login(dto: LoginDto, context: SessionContext = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      this.eventEmitter.emit('AUTH_LOGIN_FAILED', { email: dto.email, reason: 'Invalid credentials' });
      throw new AuthenticationException('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.eventEmitter.emit('AUTH_LOGIN_FAILED', { email: dto.email, reason: 'Invalid password' });
      throw new AuthenticationException('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = randomUUID();

    // Explicit Session Modeling
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: refreshToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ip: context.ip,
        userAgent: context.userAgent,
        device: context.device || 'Unknown Device',
        state: SessionState.ACTIVE,
        lastSeen: new Date(),
      },
    });

    // Domain Event
    this.eventEmitter.emit('Identity.LoginSucceeded', { userId: user.id, sessionId: session.id });
    // Audit Event
    this.eventEmitter.emit('AUTH_LOGIN_SUCCESS', { userId: user.id, sessionId: session.id, ip: context.ip });

    return {
      id: user.id,
      email: user.email,
      accessToken,
      refreshToken,
    };
  }

  async logout(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { sessionToken: refreshToken },
    });

    if (!session) {
      throw new AuthenticationException('SESSION_NOT_FOUND', 'Session not found or already revoked');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { state: SessionState.REVOKED },
    });

    // Domain Event
    this.eventEmitter.emit('Identity.SessionRevoked', { sessionId: session.id });
    // Audit Event
    this.eventEmitter.emit('AUTH_LOGOUT', { userId: session.userId, sessionId: session.id });

    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string, context: SessionContext = {}) {
    const session = await this.prisma.session.findUnique({
      where: { sessionToken: refreshToken },
      include: { user: true },
    });

    if (!session) {
      this.eventEmitter.emit('AUTH_REFRESH_FAILED', { reason: 'Token not found' });
      throw new AuthenticationException('INVALID_TOKEN', 'Invalid refresh token');
    }

    if (session.state === 'REVOKED') {
      // Security Risk: Refresh Token Reuse Detection
      await this.prisma.session.updateMany({
        where: { userId: session.userId, state: SessionState.ACTIVE },
        data: { state: SessionState.REVOKED },
      });
      
      this.eventEmitter.emit('Security.TokenReuseDetected', { userId: session.userId, sessionId: session.id });
      this.eventEmitter.emit('AUTH_SECURITY_ALERT', { type: 'TOKEN_REUSE', userId: session.userId });
      
      throw new AuthenticationException('TOKEN_REVOKED', 'Refresh token has been revoked. All sessions terminated.');
    }

    if (session.expires < new Date() || session.state === 'EXPIRED') {
      await this.prisma.session.update({ where: { id: session.id }, data: { state: 'EXPIRED' } });
      this.eventEmitter.emit('AUTH_REFRESH_FAILED', { reason: 'Token expired' });
      throw new AuthenticationException('TOKEN_EXPIRED', 'Refresh token has expired');
    }

    // Rotate Token
    const newRefreshToken = randomUUID();
    const payload = { sub: session.userId, email: session.user.email };
    const newAccessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });

    // Invalidate old token (create a new session conceptually or update the current one)
    // To strictly model rotation, we update the existing session token.
    await this.prisma.session.update({
      where: { id: session.id },
      data: { 
        sessionToken: newRefreshToken, 
        lastSeen: new Date(),
        ip: context.ip, // Update tracking
        userAgent: context.userAgent
      },
    });

    // Domain Event
    this.eventEmitter.emit('Identity.TokenRefreshed', { sessionId: session.id });
    // Audit Event
    this.eventEmitter.emit('AUTH_TOKEN_REFRESHED', { userId: session.userId, sessionId: session.id });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // NextAuth OAuth Callback (Google/Microsoft)
  async validateOAuthUser(email: string, name: string, providerId: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({ data: { email } });
      this.eventEmitter.emit('AUTH_USER_REGISTERED', { userId: user.id, source: providerId });
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = randomUUID();

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: refreshToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        state: SessionState.ACTIVE,
      }
    });

    this.eventEmitter.emit('AUTH_LOGIN_SUCCESS', { userId: user.id, sessionId: session.id, source: providerId });

    return { id: user.id, email: user.email, accessToken, refreshToken };
  }
}
