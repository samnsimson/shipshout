'use client';

import { Box, Button, Flex, For, Link as ChakraLink, Show, Stack, Text } from '@chakra-ui/react';
import { CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { createBillingPortalAction, upgradeSubscriptionAction } from '@/lib/billing/actions';
import { BillingUtils } from '@/lib/billing/billing.utils';
import { Toaster } from '@/lib/feedback/toaster.utils';

export type BillingPlan = {
    name: string;
    displayName: string;
    trialDays: number | null;
    limits: { repos: number; releasesPerMonth: number | null; channels: string[] };
    isBillable: boolean;
};

export type BillingSubscription = {
    plan: string;
    status: string | null;
    periodEnd: string | null;
    limits: { repos: number; releasesPerMonth: number | null; channels: string[] };
};

export type BillingInvoice = {
    id: string;
    amountDue: number;
    currency: string;
    status: string | null;
    createdAt: string;
    hostedInvoiceUrl: string | null;
};


export function BillingSection(props: {
    subscription: BillingSubscription;
    plans: BillingPlan[];
    invoices: BillingInvoice[];
    billingStatus?: string | null;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const billablePlans = props.plans.filter((plan) => plan.isBillable);
    const upgradePlans = billablePlans.filter((plan) => plan.name !== props.subscription.plan);

    function redirectTo(result: { url: string } | { error: string }) {
        if ('error' in result) {
            Toaster.error({ title: 'Billing request failed', description: result.error });
            return;
        }
        window.location.href = result.url;
    }

    return (
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
            <Stack gap="md">
                <Flex align="center" gap="xs">
                    <CreditCard size={16} strokeWidth={2} aria-hidden />
                    <Text fontSize="sm" fontWeight="600">
                        Billing
                    </Text>
                </Flex>

                <Show when={props.billingStatus === 'success'}>
                    <Text fontSize="sm" color="fg.muted">
                        Checkout completed. Your plan will update once Stripe confirms the subscription.
                    </Text>
                </Show>
                <Show when={props.billingStatus === 'cancelled'}>
                    <Text fontSize="sm" color="fg.muted">
                        Checkout was cancelled. No changes were made.
                    </Text>
                </Show>

                <Stack gap="xs" fontSize="sm">
                    <Flex justify="space-between" gap="md">
                        <Text color="fg.muted">Current plan</Text>
                        <Text textTransform="capitalize">{props.subscription.plan}</Text>
                    </Flex>
                    <Flex justify="space-between" gap="md">
                        <Text color="fg.muted">Status</Text>
                        <Text textTransform="capitalize">{props.subscription.status ?? '—'}</Text>
                    </Flex>
                    <Flex justify="space-between" gap="md">
                        <Text color="fg.muted">Repos</Text>
                        <Text>{BillingUtils.formatLimit(props.subscription.limits.repos)}</Text>
                    </Flex>
                    <Flex justify="space-between" gap="md">
                        <Text color="fg.muted">Releases / mo</Text>
                        <Text>{BillingUtils.formatLimit(props.subscription.limits.releasesPerMonth)}</Text>
                    </Flex>
                    <Flex justify="space-between" gap="md">
                        <Text color="fg.muted">Channels</Text>
                        <Text>{BillingUtils.formatChannels(props.subscription.limits.channels)}</Text>
                    </Flex>
                    <Show when={props.subscription.periodEnd}>
                        {(periodEnd) => (
                            <Flex justify="space-between" gap="md">
                                <Text color="fg.muted">Period ends</Text>
                                <Text>{new Date(periodEnd).toLocaleDateString()}</Text>
                            </Flex>
                        )}
                    </Show>
                </Stack>

                <Text fontSize="xs" color="fg.muted">
                    Starter includes a one-time trial. Each account can use a trial once.
                </Text>

                <Flex gap="sm" flexWrap="wrap">
                    <For each={upgradePlans}>
                        {(plan) => (
                            <Button
                                key={plan.name}
                                size="sm"
                                borderRadius="md"
                                disabled={pending}
                                onClick={() => {
                                    startTransition(async () => {
                                        redirectTo(await upgradeSubscriptionAction(plan.name as 'starter' | 'pro'));
                                        router.refresh();
                                    });
                                }}
                            >
                                Upgrade to {plan.displayName}
                                {plan.trialDays ? ` (${plan.trialDays}-day trial)` : ''}
                            </Button>
                        )}
                    </For>
                    <Button
                        size="sm"
                        variant="outline"
                        borderRadius="md"
                        disabled={pending}
                        onClick={() => {
                            startTransition(async () => {
                                redirectTo(await createBillingPortalAction());
                            });
                        }}
                    >
                        Manage billing
                    </Button>
                </Flex>

                <Stack gap="xs">
                    <Text fontSize="sm" fontWeight="600">
                        Recent invoices
                    </Text>
                    <Show
                        when={props.invoices.length > 0}
                        fallback={
                            <Text fontSize="sm" color="fg.muted">
                                No invoices yet.
                            </Text>
                        }
                    >
                        <For each={props.invoices}>
                            {(invoice) => (
                                <Flex key={invoice.id} justify="space-between" gap="md" fontSize="sm">
                                <Text color="fg.muted">{new Date(invoice.createdAt).toLocaleDateString()}</Text>
                                <Text>
                                    {BillingUtils.formatMoney(invoice.amountDue, invoice.currency)}
                                    {invoice.status ? ` · ${invoice.status}` : ''}
                                </Text>
                                <Show when={invoice.hostedInvoiceUrl} fallback={<Text color="fg.muted">—</Text>}>
                                    {(hostedInvoiceUrl) => (
                                        <ChakraLink href={hostedInvoiceUrl} target="_blank" rel="noreferrer">
                                            View
                                        </ChakraLink>
                                    )}
                                </Show>
                                </Flex>
                            )}
                        </For>
                    </Show>
                </Stack>
            </Stack>
        </Box>
    );
}
