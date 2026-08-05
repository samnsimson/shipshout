import { Module, forwardRef } from '@nestjs/common';
import Stripe from 'stripe';
import { BillingService, SubscriptionSyncService } from '@shipshout/billing';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { WorkspaceRepository } from '../workspaces/repositories/workspace.repository';
import { BillingController } from './billing.controller';
import { SubscriptionRepository, UsageCounterRepository } from './billing.repositories';
import { TierService } from './tier.service';

@Module({
    imports: [DatabaseModule, AuthModule, WorkspacesModule, forwardRef(() => RepositoriesModule)],
    controllers: [BillingController],
    providers: [
        SubscriptionRepository,
        UsageCounterRepository,
        TierService,
        {
            provide: Stripe,
            useFactory: () => new Stripe(process.env.STRIPE_SECRET_KEY ?? ''),
        },
        {
            provide: BillingService,
            useFactory: (stripe: Stripe, workspaces: WorkspaceRepository) => new BillingService(stripe, workspaces),
            inject: [Stripe, WorkspaceRepository],
        },
        {
            provide: SubscriptionSyncService,
            useFactory: (subs: SubscriptionRepository, workspaces: WorkspaceRepository) => new SubscriptionSyncService(subs, workspaces),
            inject: [SubscriptionRepository, WorkspaceRepository],
        },
    ],
    exports: [TierService],
})
export class BillingModule {}
