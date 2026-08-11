'use client';

import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { Menu, ShipWheel } from 'lucide-react';
import { LogoutButton } from '../auth/logout-button';

export function TopBar(props: {
    user: { email: string; name: string; username?: string | null; image?: string | null };
    onOpenSidebar: () => void;
}) {
    return (
        <Flex
            as="header"
            align="center"
            justify="space-between"
            px={{ base: 'md', md: 'xl' }}
            py="md"
            bg="bg.canvas"
            borderBottomWidth="1px"
            borderColor="border.hairline"
        >
            <Flex align="center" gap="md">
                <Button
                    aria-label="Open navigation"
                    variant="ghost"
                    display={{ base: 'inline-flex', md: 'none' }}
                    onClick={props.onOpenSidebar}
                    minW="unset"
                    px="0"
                    borderRadius="md"
                >
                    <Menu size={18} strokeWidth={2} aria-hidden />
                </Button>
                <Flex align="center" gap="xs">
                    <ShipWheel size={16} strokeWidth={2} aria-hidden />
                    <Text fontSize="sm" fontWeight="600" letterSpacing="-0.125px">
                        Shipshout
                    </Text>
                </Flex>
            </Flex>

            <Box>
                <LogoutButton />
            </Box>
        </Flex>
    );
}
