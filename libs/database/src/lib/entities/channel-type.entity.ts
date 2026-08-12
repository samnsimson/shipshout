import { Column, Entity, PrimaryColumn } from 'typeorm';

export type ChannelKind = 'notify' | 'publish';

@Entity('channel_types')
export class ChannelTypeEntity {
    @PrimaryColumn({ type: 'varchar', length: 64 })
    key!: string;

    @Column({ type: 'varchar', length: 128 })
    displayName!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({ type: 'varchar', length: 32 })
    kind!: ChannelKind;

    @Column({ type: 'jsonb' })
    configSchema!: Record<string, unknown>;

    @Column({ type: 'int' })
    sortOrder!: number;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;
}
