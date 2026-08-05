import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity';

export enum Tone {
    DevFocused = 'dev_focused',
    Professional = 'professional',
    HypeStartup = 'hype_startup',
}

@Entity('brand_profiles')
export class BrandProfile {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
    @Column({ type: 'enum', enum: Tone, default: Tone.Professional }) tone!: Tone;
    @Column({ type: 'text', nullable: true }) customInstructions?: string;
    @Column({ default: true }) emojiPolicy!: boolean;
}
