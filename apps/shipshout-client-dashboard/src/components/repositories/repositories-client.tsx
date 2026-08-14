'use client';

import { Box, Stack } from '@chakra-ui/react';
import { AddRepositoriesPanel } from './add-repositories-panel';
import { GithubConnectCard } from './github-connect-card';
import { GithubConnectionCard } from './github-connection-card';
import { LinkedRepositoriesTable } from './linked-repositories-table';
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
    const connected = Boolean(props.connection.connected);

    if (!connected) {
        return (
            <Stack gap="lg">
                <QueryBanner githubQuery={props.githubQuery} githubReason={props.githubReason} />
                <GithubConnectCard connectUrl={props.connectUrl} />
            </Stack>
        );
    }

    return (
        <Stack gap="lg">
            <QueryBanner githubQuery={props.githubQuery} githubReason={props.githubReason} />
            <GithubConnectionCard connection={props.connection} linkedCount={props.linked.length} />
            <LinkedRepositoriesTable linked={props.linked} />
            <Box borderTopWidth="1px" borderTopColor="border.hairline" />
            <AddRepositoriesPanel available={props.available} />
        </Stack>
    );
}
