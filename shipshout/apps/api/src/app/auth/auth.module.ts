import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import {
    AuthService,
    GithubStrategy,
    GoogleStrategy,
    LocalStrategy,
    WorkspaceGuard,
    UserRepository,
    UserIdentityRepository,
    AuthTokenRepository,
    WorkspaceRepository,
    MembershipRepository,
} from '@shipshout/auth';
import { AuthController } from './controllers/auth.controller';
import { GoogleOAuthCallbackController } from './controllers/google-oauth-callback.controller';
import { SessionUserMiddleware } from './middleware/session-user.middleware';
import { AuthMailService } from './services/auth-mail.service';
import { GithubOAuthLoginService } from './services/github-oauth-login.service';
import { AuthErrorFilter } from './filters/auth-error.filter';
import { DatabaseModule } from '../config/database.module';

@Module({
    imports: [DatabaseModule, PassportModule.register({ defaultStrategy: 'github' })],
    controllers: [AuthController, GoogleOAuthCallbackController],
    providers: [
        UserRepository,
        UserIdentityRepository,
        AuthTokenRepository,
        WorkspaceRepository,
        MembershipRepository,
        AuthService,
        AuthMailService,
        GithubOAuthLoginService,
        GithubStrategy,
        GoogleStrategy,
        LocalStrategy,
        WorkspaceGuard,
        SessionUserMiddleware,
        { provide: APP_FILTER, useClass: AuthErrorFilter },
    ],
    exports: [AuthService, WorkspaceGuard, UserRepository, MembershipRepository, SessionUserMiddleware, GithubOAuthLoginService],
})
export class AuthModule {}
