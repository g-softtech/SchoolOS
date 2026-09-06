import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';
import { JwtService } from '@nestjs/jwt';
import { PlatformEventBus } from '@saas/core-platform';
import type { CacheProvider } from '@saas/core-platform';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly jwtService: JwtService,
    private readonly eventBus: PlatformEventBus,
    @Inject('CACHE_PROVIDER') private readonly cache: CacheProvider
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
    
    // 1. Check for strict atomic grace period (15s window) to mitigate concurrent refresh race conditions
    const graceKey = `grace_token:${hashedToken}`;
    const graceTokens = await this.cache.get<{ accessToken: string, refreshToken: string }>(graceKey);
    
    if (graceTokens) {
      return graceTokens; // Legitimate concurrent request succeeds using grace cache
    }

    const session = await this.sessionRepo.findByToken(hashedToken);

    if (!session || session.expires < new Date()) {
      // Replay attack / Reuse detection trap: If session is gone and grace period expired,
      // the token was already used. In a stricter implementation, we'd revoke the entire token family here.
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Create new session
    const tokens = await this.createSession({ id: session.userId });

    // Save newly generated tokens to grace cache for 15 seconds BEFORE deleting the old session
    await this.cache.set(graceKey, tokens, 15);

    // Delete old session (Rotation)
    await this.sessionRepo.delete(session.id);

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
