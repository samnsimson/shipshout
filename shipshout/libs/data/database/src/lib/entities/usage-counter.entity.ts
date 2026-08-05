import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Workspace } from './workspace.entity.js';

@Entity('usage_counters')
@Unique(['workspace', 'period'])
export class UsageCounter {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
    @Column() period!: string;
    @Column({ default: 0 }) releasesProcessed!: number;
}
