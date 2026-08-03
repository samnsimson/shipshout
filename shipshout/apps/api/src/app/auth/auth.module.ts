import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService, GithubStrategy, WorkspaceGuard, UserRepository, WorkspaceRepository, MembershipRepository } from '@shipshout/auth';
import { AuthController } from './auth.controller';
import { SessionUserMiddleware } from './session-user.middleware';

@Module({
    imports: [PassportModule.register({ defaultStrategy: 'github' })],
    controllers: [AuthController],
    providers: [UserRepository, WorkspaceRepository, MembershipRepository, AuthService, GithubStrategy, WorkspaceGuard, SessionUserMiddleware],
    exports: [AuthService, WorkspaceGuard, UserRepository, SessionUserMiddleware],
})
export class AuthModule {}
