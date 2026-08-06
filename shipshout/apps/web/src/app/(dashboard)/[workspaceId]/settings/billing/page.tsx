import { Badge, Card, List, Show, SimpleGrid, Text } from '@chakra-ui/react';
import { PageHeader } from '@/components/page-header';
import { BillingActions } from './billing-actions';

const TIERS = [
    { id: 'starter', name: 'Starter', price: '$19/mo', points: ['1 repository', '10 releases/mo', 'Manual output'] },
    { id: 'pro', name: 'Pro', price: '$49/mo', points: ['3 repositories', 'Unlimited releases', 'Social API sync'], highlighted: true },
    { id: 'growth', name: 'Growth', price: '$149/mo', points: ['Unlimited repositories', 'Jira/Linear integrations', 'Email digests'] },
];

export default async function BillingPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    return (
        <>
            <PageHeader title="Billing" description="Pick the plan that matches your release volume." />
            <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
                {TIERS.map((t) => (
                    <Card.Root key={t.id} borderWidth={t.highlighted ? '2px' : '1px'} borderColor={t.highlighted ? 'signal.solid' : 'border'}>
                        <Card.Header>
                            <Show when={t.highlighted}>
                                <Badge colorPalette="signal" variant="solid" mb="2" alignSelf="flex-start">
                                    Most popular
                                </Badge>
                            </Show>
                            <Card.Title fontSize="xl">{t.name}</Card.Title>
                            <Text color="fg.muted" fontWeight="medium">
                                {t.price}
                            </Text>
                        </Card.Header>
                        <Card.Body>
                            <List.Root gap="2">
                                {t.points.map((p) => (
                                    <List.Item key={p}>{p}</List.Item>
                                ))}
                            </List.Root>
                        </Card.Body>
                        <Card.Footer>
                            <BillingActions workspaceId={workspaceId} tier={t.id} />
                        </Card.Footer>
                    </Card.Root>
                ))}
            </SimpleGrid>
        </>
    );
}
