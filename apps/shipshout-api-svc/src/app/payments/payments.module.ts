import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { STRIPE_CLIENT } from './stripe.constants';

@Module({
    controllers: [PaymentsController],
    providers: [
        {
            provide: STRIPE_CLIENT,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'), { apiVersion: '2026-07-29.dahlia' }),
        },
        PaymentsService,
    ],
})
export class PaymentsModule {}
