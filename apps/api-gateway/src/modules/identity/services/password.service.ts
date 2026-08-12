import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import * as argon2 from 'argon2';
import { PlatformEventBus } from '@saas/core-platform';

@Injectable()
export class PasswordService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: PlatformEventBus
  ) {}

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId, null as any); // Global user
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid user');
    }

    const isMatch = await argon2.verify(user.passwordHash, oldPassword);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid old password');
    }

    const passwordHash = await argon2.hash(newPassword);
    
    await this.userRepository.update(userId, null as any, { passwordHash });

    await this.eventBus.publish({
      eventName: 'Identity.Password.Changed',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { userId }
    });
  }
}
