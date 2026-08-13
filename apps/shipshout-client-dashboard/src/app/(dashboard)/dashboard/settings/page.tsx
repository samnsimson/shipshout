import { Box, Flex, Show, Stack, Text } from '@chakra-ui/react';
import { Settings, User } from 'lucide-react';
import { PageHeader } from '../../../../components/dashboard/page-header';
import { BillingSection } from '../../../../components/settings/billing-section';
import { getSessionAction } from '../../../../lib/auth/actions';
import { getBillingApi } from '../../../../lib/billing/api';
import { BillingUtils } from '../../../../lib/billing/billing.utils';

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ billing?: string }>;
}) {
    const session = await getSessionAction();
    if (!session) return null;

    const { user } = session;
    const params = await searchParams;
    const { api, requestOptions } = await getBillingApi();

    const [plansRes, meRes, paymentsRes] = await Promise.all([
        api.listSubscriptionPlans(requestOptions),
        api.getMySubscription(requestOptions),
        api.listMyPayments(requestOptions),
    ]);

    const plans = plansRes.data?.plans ?? [];
    const me = meRes.data;
    const invoices = paymentsRes.data?.invoices ?? [];

    const subscription = {
        plan: me?.plan ?? 'free',
        status: BillingUtils.asString(me?.status),
        periodEnd: BillingUtils.asString(me?.periodEnd),
        limits: {
            repos: me?.limits?.repos ?? 0,
            releasesPerMonth: BillingUtils.asNumber(me?.limits?.releasesPerMonth),
            channels: me?.limits?.channels ?? [],
        },
    };

    return (
        <Stack gap="lg">
            <PageHeader icon={Settings} eyebrow="Settings" title="Account" description="Manage your profile and billing." />

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Flex align="center" gap="xs">
                        <User size={16} strokeWidth={2} aria-hidden />
                        <Text fontSize="sm" fontWeight="600">
                            Account
                        </Text>
                    </Flex>
                    <Stack gap="xs" fontSize="sm">
                        <Flex justify="space-between" gap="md">
                            <Text color="fg.muted">Name</Text>
                            <Text>{user.name || '—'}</Text>
                        </Flex>
                        <Flex justify="space-between" gap="md">
                            <Text color="fg.muted">Email</Text>
                            <Text>{user.email}</Text>
                        </Flex>
                        <Show when={user.username}>
                            <Flex justify="space-between" gap="md">
                                <Text color="fg.muted">Username</Text>
                                <Text>{user.username}</Text>
                            </Flex>
                        </Show>
                    </Stack>
                </Stack>
            </Box>

            <BillingSection
                subscription={subscription}
                plans={plans.map((plan) => ({
                    name: plan.name,
                    displayName: plan.displayName,
                    trialDays: BillingUtils.asNumber(plan.trialDays),
                    limits: {
                        repos: plan.limits.repos,
                        releasesPerMonth: BillingUtils.asNumber(plan.limits.releasesPerMonth),
                        channels: plan.limits.channels ?? [],
                    },
                    isBillable: plan.isBillable,
                }))}
                invoices={invoices.map((invoice) => ({
                    id: invoice.id,
                    amountDue: invoice.amountDue,
                    currency: invoice.currency,
                    status: BillingUtils.asString(invoice.status),
                    createdAt: invoice.createdAt,
                    hostedInvoiceUrl: BillingUtils.asString(invoice.hostedInvoiceUrl),
                }))}
                billingStatus={params.billing ?? null}
            />
        </Stack>
    );
}
