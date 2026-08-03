import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity.js';
import { Workspace } from './workspace.entity.js';

export enum MembershipRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
}

@Entity('memberships')
@Unique(['user', 'workspace'])
export class Membership {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => User, { eager: true }) user!: User;
  @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
  @Column({ type: 'enum', enum: MembershipRole, default: MembershipRole.Member })
  role!: MembershipRole;
}
