import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
    return (
        <Box
            maxW="420px"
            w="100%"
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.hairline"
            borderRadius="lg"
            px="lg"
            py="xxl"
            boxShadow="sm"
        >
            <Stack gap="xl">
                <Stack gap="xs" textAlign="center">
                    <Text fontSize="sm" fontWeight="600" letterSpacing="0.125px" color="brand.fg">
                        Shipshout
                    </Text>
                    <Heading as="h1" size="xl" fontWeight="700" letterSpacing="-0.625px">
                        {title}
                    </Heading>
                </Stack>
                {children}
                {footer}
            </Stack>
        </Box>
    );
}
