import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';
import { JwtService } from '@nestjs/jwt';
import { PlatformEventBus } from '@saas/core-platform';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly jwtService: JwtService,
    private readonly eventBus: PlatformEventBus
  ) {}

  async createSession(user: any): Promise<{ accessToken: string, refreshToken: string }> {
    // 15-minute access token as mandated by SECURITY_REQUIREMENTS
    const payload = { sub: user.id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // Generate cryptographically secure refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Expiry: 7 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    await this.sessionRepo.create({
      sessionToken: hashedToken,
      userId: user.id,
      expires
    });

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(refreshToken: string): Promise<{ accessToken: string, refreshToken: string }> {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await this.sessionRepo.findByToken(hashedToken);

    if (!session || session.expires < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Delete old session (Rotation)
    await this.sessionRepo.delete(session.id);

    // Create new session
    const tokens = await this.createSession({ id: session.userId });

    // Emit event asynchronously
    this.eventBus.publish({
      eventName: 'Identity.Token.Refreshed',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { userId: session.userId }
    }).catch(e => console.error("Failed to emit audit event", e));

    return tokens;
  }
}
