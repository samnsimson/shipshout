import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity.js';

export enum AuthTokenType {
    EmailVerify = 'email_verify',
    PasswordReset = 'password_reset',
}

@Entity('auth_tokens')
export class AuthToken {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => User, { onDelete: 'CASCADE' }) user!: User;
    @Column() userId!: string;
    @Column({ type: 'enum', enum: AuthTokenType }) type!: AuthTokenType;
    @Column() tokenHash!: string;
    @Column() expiresAt!: Date;
    @Column({ nullable: true }) usedAt?: Date;
    @CreateDateColumn() createdAt!: Date;
}
