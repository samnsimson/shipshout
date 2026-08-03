import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership, User, Workspace } from '@shipshout/data-entities';
import { AuthService, GithubStrategy, WorkspaceGuard } from '@shipshout/auth';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Workspace, Membership]),
    PassportModule.register({ defaultStrategy: 'github' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GithubStrategy, WorkspaceGuard],
  exports: [AuthService, WorkspaceGuard],
})
export class AuthModule {}
