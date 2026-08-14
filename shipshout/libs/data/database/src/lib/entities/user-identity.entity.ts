import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity.js';

export enum IdentityProvider {
    Github = 'github',
    Google = 'google',
    Credentials = 'credentials',
}

@Entity('user_identities')
@Unique(['provider', 'providerUserId'])
@Unique(['userId', 'provider'])
export class UserIdentity {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => User, { onDelete: 'CASCADE' }) user!: User;
    @Column() userId!: string;
    @Column({ type: 'enum', enum: IdentityProvider }) provider!: IdentityProvider;
    @Column() providerUserId!: string;
    @Column({ nullable: true }) passwordHash?: string;
    @CreateDateColumn() createdAt!: Date;
}
