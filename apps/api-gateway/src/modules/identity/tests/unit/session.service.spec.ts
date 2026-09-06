import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../../services/session.service';
import { SessionRepository } from '../../repositories/session.repository';
import { JwtService } from '@nestjs/jwt';
import { PlatformEventBus } from '@saas/core-platform';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let cacheProvider: any;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    sessionRepo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      delete: jest.fn(),
    } as any;

    cacheProvider = {
      get: jest.fn(),
      set: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    } as any;

    const eventBus = {
      publish: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SessionRepository, useValue: sessionRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: PlatformEventBus, useValue: eventBus },
        { provide: 'CACHE_PROVIDER', useValue: cacheProvider },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  describe('rotateRefreshToken', () => {
    it('should throw UnauthorizedException if session not found and grace cache is empty (Reuse/Replay Attack)', async () => {
      cacheProvider.get.mockResolvedValue(null);
      sessionRepo.findByToken.mockResolvedValue(null);

      await expect(service.rotateRefreshToken('stolen-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should succeed via grace period cache if concurrent requests arrive', async () => {
      const graceTokens = { accessToken: 'grace-access', refreshToken: 'grace-refresh' };
      cacheProvider.get.mockResolvedValue(graceTokens);

      const result = await service.rotateRefreshToken('valid-token-in-grace');

      expect(result).toEqual(graceTokens);
      expect(sessionRepo.findByToken).not.toHaveBeenCalled();
    });

    it('should rotate token, save to grace cache for 15s, and delete old session', async () => {
      cacheProvider.get.mockResolvedValue(null);
      sessionRepo.findByToken.mockResolvedValue({
        id: 'session-123',
        userId: 'user-1',
        sessionToken: 'hashed-token',
        expires: new Date(Date.now() + 100000),
      } as any);

      const result = await service.rotateRefreshToken('valid-token');

      expect(cacheProvider.set).toHaveBeenCalledWith(
        expect.stringContaining('grace_token:'),
        expect.objectContaining({
          accessToken: 'mock-jwt-token',
          refreshToken: expect.any(String)
        }),
        15
      );
      expect(sessionRepo.delete).toHaveBeenCalledWith('session-123');
      expect(result.accessToken).toBe('mock-jwt-token');
    });
  });
});
