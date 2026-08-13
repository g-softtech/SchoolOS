import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthSimulatorController } from './auth-simulator.controller';
import { WorkspaceModule } from '../workspace/workspace.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [
    PolicyModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super-secret-default-key-do-not-use-in-prod',
      signOptions: { expiresIn: '1d' },
    }),
    EventEmitterModule.forRoot(),
    WorkspaceModule,
  ],
  controllers: [AuthController, AuthSimulatorController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
