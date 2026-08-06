'use client';

import { Box, Show, Text, VStack } from '@chakra-ui/react';
import { LuCreditCard, LuFileText, LuFolderGit2, LuPalette, LuPlug, LuUser } from 'react-icons/lu';
import { Logo } from '@/components/logo';
import { NavItem } from '@/components/nav-item';
import { useSidebar } from '@/context/sidebar-context';

function SectionLabel({ children, show }: { children: React.ReactNode; show: boolean }) {
    if (!show) {
        return (
            <Text px="3" mb="4" fontSize="xs" fontWeight="medium" color="fg.subtle" textTransform="uppercase" letterSpacing="wide" textAlign="center">
                ···
            </Text>
        );
    }
    return (
        <Text px="3" mb="4" fontSize="xs" fontWeight="medium" color="fg.subtle" textTransform="uppercase" letterSpacing="wide">
            {children}
        </Text>
    );
}

export function AppSidebar({ activeWs }: { activeWs?: string }) {
    const { isExpanded, isHovered, isMobileOpen, setIsHovered } = useSidebar();
    const showLabels = isExpanded || isHovered || isMobileOpen;
    const width = showLabels ? '290px' : '90px';

    return (
        <Box
            as="aside"
            position="fixed"
            top="0"
            left="0"
            h="100vh"
            w={width}
            zIndex="50"
            bg={{ _light: 'white', _dark: 'gray.900' }}
            borderRightWidth="1px"
            borderColor="border"
            transition="width 0.3s ease, transform 0.3s ease"
            transform={{ base: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)', lg: 'translateX(0)' }}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            px="5"
            py="8"
            overflowY="auto"
            css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
        >
            <Box display="flex" justifyContent={showLabels ? 'flex-start' : 'center'} mb="6">
                {showLabels ? <Logo variant="full" /> : <Logo variant="icon" />}
            </Box>

            <Show when={activeWs}>
                {(ws) => (
                    <VStack align="stretch" gap="6">
                        <Box>
                            <SectionLabel show={showLabels}>Menu</SectionLabel>
                            <VStack align="stretch" gap="1">
                                <NavItem href={`/${ws}/drafts`} icon={<LuFileText size={20} />} showLabel={showLabels}>
                                    Drafts
                                </NavItem>
                            </VStack>
                        </Box>
                        <Box>
                            <SectionLabel show={showLabels}>Settings</SectionLabel>
                            <VStack align="stretch" gap="1">
                                <NavItem href={`/${ws}/settings/repositories`} icon={<LuFolderGit2 size={20} />} showLabel={showLabels}>
                                    Repositories
                                </NavItem>
                                <NavItem href={`/${ws}/settings/connections`} icon={<LuPlug size={20} />} showLabel={showLabels}>
                                    Connections
                                </NavItem>
                                <NavItem href={`/${ws}/settings/brand`} icon={<LuPalette size={20} />} showLabel={showLabels}>
                                    Brand
                                </NavItem>
                                <NavItem href={`/${ws}/settings/billing`} icon={<LuCreditCard size={20} />} showLabel={showLabels}>
                                    Billing
                                </NavItem>
                                <NavItem href={`/${ws}/settings/account`} icon={<LuUser size={20} />} showLabel={showLabels}>
                                    Account
                                </NavItem>
                            </VStack>
                        </Box>
                    </VStack>
                )}
            </Show>
        </Box>
    );
}
