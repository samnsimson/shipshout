import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SubscriptionPlanLimits = {
    repos: number;
    releasesPerMonth: number | null;
    channels: string[];
};

@Entity('subscription_plans')
export class SubscriptionPlanEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 64, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 128 })
    displayName!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripePriceId!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripeAnnualPriceId!: string | null;

    @Column({ type: 'int', nullable: true })
    trialDays!: number | null;

    @Column({ type: 'jsonb' })
    limits!: SubscriptionPlanLimits;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'int', default: 0 })
    sortOrder!: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
