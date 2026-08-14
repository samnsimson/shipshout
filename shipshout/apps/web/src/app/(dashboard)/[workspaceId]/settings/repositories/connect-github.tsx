'use client';

import { Button, Card, Text } from '@chakra-ui/react';
import { LuGithub } from 'react-icons/lu';
import { connectGithubUrl } from '../../../../../lib/repositories';

export function ConnectGithub({ workspaceId }: { workspaceId: string }) {
    return (
        <Card.Root maxW="2xl">
            <Card.Body>
                <Card.Title mb="2">Connect a repository</Card.Title>
                <Text color="fg.muted" mb="4">
                    GitHub will ask you to select repositories and approve permissions so ShipShout can register release
                    webhooks automatically. No manual webhook setup required.
                </Text>
                <Button asChild colorPalette="brand">
                    <a href={connectGithubUrl(workspaceId)}>
                        <LuGithub /> Connect with GitHub
                    </a>
                </Button>
            </Card.Body>
        </Card.Root>
    );
}
