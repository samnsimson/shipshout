import { redirect } from 'next/navigation';
import { Box, Flex } from '@chakra-ui/react';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';
import { Sidebar } from './sidebar';

async function getWorkspaces() {
    try {
        return await apiFetch('/workspaces');
    } catch {
        return [];
    }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getSessionUser();
    if (!user) redirect('/login');
    const workspaces = await getWorkspaces();
    const activeWs = workspaces[0]?.id;
    return (
        <Flex minH="100vh" direction={{ base: 'column', md: 'row' }} bg="bg">
            <Sidebar workspaces={workspaces} activeWs={activeWs} user={user} />
            <Flex as="main" flex="1" direction="column" p={{ base: 4, md: 8 }} overflowY="auto">
                <Box maxW="5xl" w="full" mx="auto">
                    {children}
                </Box>
            </Flex>
        </Flex>
    );
}
