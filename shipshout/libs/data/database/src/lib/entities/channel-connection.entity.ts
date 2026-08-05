import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity.js';
import { Channel } from './draft.entity.js';

export enum ConnectionStatus {
    Active = 'active',
    Revoked = 'revoked',
}

@Entity('channel_connections')
export class ChannelConnection {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
    @Column({ type: 'enum', enum: Channel }) type!: Channel;
    @Column({ type: 'text' }) accessToken!: string;
    @Column({ type: 'text', nullable: true }) refreshToken?: string;
    @Column({ nullable: true }) externalAccountId?: string;
    @Column({ type: 'enum', enum: ConnectionStatus, default: ConnectionStatus.Active })
    status!: ConnectionStatus;
}
