'use client';

import { Box, Button, Flex, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import { CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createBillingPortalAction, upgradeSubscriptionAction } from '../../lib/billing/actions';

export type BillingPlan = {
    name: string;
    displayName: string;
    trialDays: number | null;
    limits: { repos: number; releasesPerMonth: number | null };
    isBillable: boolean;
};

export type BillingSubscription = {
    plan: string;
    status: string | null;
    periodEnd: string | null;
    limits: { repos: number; releasesPerMonth: number | null };
};

export type BillingInvoice = {
    id: string;
    amountDue: number;
    currency: string;
    status: string | null;
    createdAt: string;
    hostedInvoiceUrl: string | null;
};

function formatLimit(value: number | null): string {
    if (value === null) return 'Unlimited';
    return String(value);
}

function formatMoney(amountDue: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amountDue / 100);
}

export function BillingSection(props: {
    subscription: BillingSubscription;
    plans: BillingPlan[];
    invoices: BillingInvoice[];
    billingStatus?: string | null;
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const billablePlans = props.plans.filter((plan) => plan.isBillable);

    function redirectTo(result: { url: string } | { error: string }) {
        if ('error' in result) {
            setError(result.error);
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

                {props.billingStatus === 'success' ? (
                    <Text fontSize="sm" color="fg.muted">
                        Checkout completed. Your plan will update once Stripe confirms the subscription.
                    </Text>
                ) : null}
                {props.billingStatus === 'cancelled' ? (
                    <Text fontSize="sm" color="fg.muted">
                        Checkout was cancelled. No changes were made.
                    </Text>
                ) : null}

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
                        <Text>{formatLimit(props.subscription.limits.repos)}</Text>
                    </Flex>
                    <Flex justify="space-between" gap="md">
                        <Text color="fg.muted">Releases / mo</Text>
                        <Text>{formatLimit(props.subscription.limits.releasesPerMonth)}</Text>
                    </Flex>
                    {props.subscription.periodEnd ? (
                        <Flex justify="space-between" gap="md">
                            <Text color="fg.muted">Period ends</Text>
                            <Text>{new Date(props.subscription.periodEnd).toLocaleDateString()}</Text>
                        </Flex>
                    ) : null}
                </Stack>

                <Text fontSize="xs" color="fg.muted">
                    Starter includes a one-time trial. Each account can use a trial once.
                </Text>

                {error ? (
                    <Text fontSize="sm" color="red.500">
                        {error}
                    </Text>
                ) : null}

                <Flex gap="sm" flexWrap="wrap">
                    {billablePlans.map((plan) => {
                        if (plan.name === props.subscription.plan) return null;
                        return (
                            <Button
                                key={plan.name}
                                size="sm"
                                borderRadius="md"
                                disabled={pending}
                                onClick={() => {
                                    setError(null);
                                    startTransition(async () => {
                                        redirectTo(await upgradeSubscriptionAction(plan.name as 'starter' | 'pro'));
                                        router.refresh();
                                    });
                                }}
                            >
                                Upgrade to {plan.displayName}
                                {plan.trialDays ? ` (${plan.trialDays}-day trial)` : ''}
                            </Button>
                        );
                    })}
                    <Button
                        size="sm"
                        variant="outline"
                        borderRadius="md"
                        disabled={pending}
                        onClick={() => {
                            setError(null);
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
                    {props.invoices.length === 0 ? (
                        <Text fontSize="sm" color="fg.muted">
                            No invoices yet.
                        </Text>
                    ) : (
                        props.invoices.map((invoice) => (
                            <Flex key={invoice.id} justify="space-between" gap="md" fontSize="sm">
                                <Text color="fg.muted">{new Date(invoice.createdAt).toLocaleDateString()}</Text>
                                <Text>
                                    {formatMoney(invoice.amountDue, invoice.currency)}
                                    {invoice.status ? ` · ${invoice.status}` : ''}
                                </Text>
                                {invoice.hostedInvoiceUrl ? (
                                    <ChakraLink href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                                        View
                                    </ChakraLink>
                                ) : (
                                    <Text color="fg.muted">—</Text>
                                )}
                            </Flex>
                        ))
                    )}
                </Stack>
            </Stack>
        </Box>
    );
}
