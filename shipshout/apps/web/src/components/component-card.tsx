import { Box, Heading, Text } from '@chakra-ui/react';

export function ComponentCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
    return (
        <Box borderWidth="1px" borderColor="border" borderRadius="2xl" bg={{ _light: 'white', _dark: 'rgba(255,255,255,0.03)' }}>
            <Box px="6" py="5">
                <Heading size="md" fontWeight="medium">
                    {title}
                </Heading>
                {desc && (
                    <Text mt="1" fontSize="sm" color="fg.muted">
                        {desc}
                    </Text>
                )}
            </Box>
            <Box p={{ base: 4, sm: 6 }} borderTopWidth="1px" borderColor={{ _light: 'gray.100', _dark: 'gray.800' }}>
                {children}
            </Box>
        </Box>
    );
}
