import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import * as argon2 from 'argon2';
import { PlatformEventBus } from '@saas/core-platform';
import { SessionService } from './session.service';

export interface RegisterDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly eventBus: PlatformEventBus
  ) {}

  async register(dto: RegisterDto): Promise<{ user: any, accessToken: string, refreshToken: string }> {
    return this.userRepository.transaction(async (repo) => {
      const existing = await repo.findByEmail(dto.email);
      if (existing) {
        throw new Error('User already exists');
      }

      let passwordHash = undefined;
      if (dto.password) {
         passwordHash = await argon2.hash(dto.password);
      }

      const user = await repo.create({
        email: dto.email,
        passwordHash,
        globalRole: 'USER'
      });

      await this.eventBus.publish({
        eventName: 'Identity.User.Registered',
        version: 1,
        occurredAt: new Date().toISOString(),
        payload: {
          userId: user.id,
          email: user.email
        }
      });

      const tokens = await this.sessionService.createSession(user);

      return { user, ...tokens };
    });
  }
}
