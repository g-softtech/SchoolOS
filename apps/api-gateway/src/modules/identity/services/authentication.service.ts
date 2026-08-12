import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import * as argon2 from 'argon2';
import { PlatformEventBus } from '@saas/core-platform';
import { SessionService } from './session.service';

export interface LoginDto {
  email: string;
  password?: string;
}

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly eventBus: PlatformEventBus
  ) {}

  async login(dto: LoginDto, ipAddress: string): Promise<{ accessToken: string, refreshToken: string }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.passwordHash || !dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Emit event asynchronously to not block the <100ms SLA
    this.eventBus.publish({
      eventName: 'Identity.User.LoggedIn',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: {
        userId: user.id,
        ipAddress
      }
    }).catch(e => console.error("Failed to emit audit event", e));

    return this.sessionService.createSession(user);
  }
}
