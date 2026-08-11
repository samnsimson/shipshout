'use client';

import { Alert, Box, Button, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { disconnectGithubAction, linkRepositoriesAction, unlinkRepositoryAction } from '../../lib/repositories/actions';
import { QueryBanner } from './query-banner';
import type { GithubConnectionResponseDto, GithubRepoDto, LinkedRepositoryResponseDto } from '@shipshout/api-client';

export function RepositoriesClient(props: {
    connection: GithubConnectionResponseDto;
    available: GithubRepoDto[];
    linked: LinkedRepositoryResponseDto[];
    connectUrl: string;
    githubQuery?: string;
    githubReason?: string;
}) {
    const [selected, setSelected] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const connected = Boolean(props.connection.connected);

    const selectable = useMemo(() => props.available.filter((r) => !r.linked), [props.available]);

    const toggle = (githubId: number, checked: boolean) => {
        setSelected((prev) => {
            if (checked) {
                if (prev.includes(githubId)) return prev;
                return [...prev, githubId];
            }
            return prev.filter((id) => id !== githubId);
        });
    };

    if (!connected) {
        return (
            <Stack gap="lg">
                <QueryBanner githubQuery={props.githubQuery} githubReason={props.githubReason} />

                <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                    <Stack gap="md">
                        <Text fontSize="sm" fontWeight="600">
                            Connect GitHub to link repositories
                        </Text>
                        <ChakraLink
                            href={props.connectUrl}
                            display="inline-flex"
                            alignItems="center"
                            justifyContent="center"
                            bg="brand.solid"
                            color="white"
                            borderRadius="full"
                            px="lg"
                            h="44px"
                            fontWeight="500"
                            _hover={{ textDecoration: 'none', bg: 'brand.600' }}
                        >
                            Connect GitHub
                        </ChakraLink>
                    </Stack>
                </Box>
            </Stack>
        );
    }

    return (
        <Stack gap="lg">
            <QueryBanner githubQuery={props.githubQuery} githubReason={props.githubReason} />

            {error ? (
                <Alert.Root status="error" borderRadius="lg">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                </Alert.Root>
            ) : null}

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="sm">
                    <Text fontSize="sm" fontWeight="600">
                        Connected as {props.connection.githubUsername ?? 'GitHub'}
                    </Text>
                    <Button
                        variant="outline"
                        borderColor="border.hairline"
                        borderRadius="full"
                        onClick={() =>
                            startTransition(() => {
                                disconnectGithubAction().then((res) => {
                                    if (!res.ok) setError(res.error);
                                });
                            })
                        }
                        loading={pending}
                        alignSelf="flex-start"
                    >
                        Disconnect
                    </Button>
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                {props.linked.length === 0 ? (
                    <Text color="fg.muted" fontSize="sm">
                        No repositories linked yet.
                    </Text>
                ) : (
                    <Stack gap="xs">
                        {props.linked.map((repo) => (
                            <FlexRow key={repo.id} left={repo.fullName}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    borderColor="border.hairline"
                                    borderRadius="full"
                                    onClick={() =>
                                        startTransition(() => {
                                            unlinkRepositoryAction(repo.id).then((res) => {
                                                if (!res.ok) setError(res.error);
                                            });
                                        })
                                    }
                                    loading={pending}
                                >
                                    Unlink
                                </Button>
                            </FlexRow>
                        ))}
                    </Stack>
                )}
            </Box>

            <Box borderTopWidth="1px" borderTopColor="border.hairline" />

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Text fontSize="sm" fontWeight="600">
                        Add repositories
                    </Text>

                    <Stack maxH="320px" overflow="auto" gap="xs">
                        {selectable.length === 0 ? (
                            <Text color="fg.muted" fontSize="sm">
                                No available repositories to link.
                            </Text>
                        ) : (
                            selectable.map((repo) => (
                                <Box
                                    key={repo.githubId}
                                    borderWidth="1px"
                                    borderColor={selected.includes(repo.githubId) ? 'brand.solid' : 'border.hairline'}
                                    borderRadius="md"
                                    px="sm"
                                    py="xs"
                                    cursor="pointer"
                                    bg={selected.includes(repo.githubId) ? 'bg.canvas' : 'transparent'}
                                    onClick={() => toggle(repo.githubId, !selected.includes(repo.githubId))}
                                >
                                    <Text fontSize="sm" fontWeight={selected.includes(repo.githubId) ? 600 : 400}>
                                        {repo.fullName}
                                    </Text>
                                </Box>
                            ))
                        )}
                    </Stack>

                    <Button
                        variant="solid"
                        colorScheme="blue"
                        borderRadius="full"
                        onClick={() =>
                            startTransition(() => {
                                linkRepositoriesAction(selected).then((res) => {
                                    if (!res.ok) setError(res.error);
                                });
                            })
                        }
                        loading={pending}
                        disabled={selected.length === 0}
                        alignSelf="flex-start"
                    >
                        Link selected
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
}

function FlexRow(props: { left: string; children: ReactNode }) {
    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap="md">
            <Text fontSize="sm" fontWeight="600">
                {props.left}
            </Text>
            {props.children}
        </Stack>
    );
}

