import { Box, Flex, For, Grid, Heading, Stack, Text } from '@chakra-ui/react';
import { Megaphone, Radio, ShipWheel } from 'lucide-react';

type Sticker = {
    bg: string;
    size: string;
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
};

const STICKERS: Sticker[] = [
    { bg: '#d6b6f6', top: '12%', left: '8%', size: '56px' },
    { bg: '#62aef0', top: '22%', right: '14%', size: '44px' },
    { bg: '#ff64c8', bottom: '28%', left: '12%', size: '40px' },
    { bg: '#2a9d99', bottom: '18%', right: '10%', size: '52px' },
    { bg: '#1aae39', top: '48%', right: '22%', size: '36px' },
];

export function AuthMarketingPanel() {
    return (
        <Flex position="relative" direction="column" align="center" justify="center" h="100%" minH="100dvh" px="xxl" py="xxl" bg="brand.800" overflow="hidden">
            <For each={STICKERS}>
                {(sticker, index) => (
                    <Box
                        key={index}
                        position="absolute"
                        top={sticker.top}
                        left={sticker.left}
                        right={sticker.right}
                        bottom={sticker.bottom}
                        w={sticker.size}
                        h={sticker.size}
                        borderRadius="lg"
                        bg={sticker.bg}
                        opacity={0.85}
                        aria-hidden
                    />
                )}
            </For>
            <Stack gap="xl" position="relative" zIndex="1" w="100%" maxW="520px" mx="auto" align="center" textAlign="center">
                <Stack gap="md" align="center">
                    <Flex align="center" gap="xs" color="whiteAlpha.900" justify="center">
                        <ShipWheel size={18} strokeWidth={2} aria-hidden />
                        <Text fontSize="sm" fontWeight="600" letterSpacing="0.125px">
                            Shipshout
                        </Text>
                    </Flex>
                    <Heading as="h2" fontSize={{ lg: '4xl', xl: '5xl' }} fontWeight="700" letterSpacing="-1px" lineHeight="1.05" color="white">
                        Ship it. Shout it. Everywhere.
                    </Heading>
                    <Text fontSize="lg" lineHeight="1.5" color="whiteAlpha.800">
                        Turn releases into polished announcements across Slack, email, and the channels your team already uses.
                    </Text>
                </Stack>

                <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="md" w="100%">
                    <Flex align="center" gap="sm" px="md" py="sm" borderRadius="lg" bg="whiteAlpha.100" borderWidth="1px" borderColor="whiteAlpha.200">
                        <Megaphone size={16} strokeWidth={2} color="white" aria-hidden />
                        <Text fontSize="sm" fontWeight="500" color="whiteAlpha.900">
                            Release shoutouts
                        </Text>
                    </Flex>
                    <Flex align="center" gap="sm" px="md" py="sm" borderRadius="lg" bg="whiteAlpha.100" borderWidth="1px" borderColor="whiteAlpha.200">
                        <Radio size={16} strokeWidth={2} color="white" aria-hidden />
                        <Text fontSize="sm" fontWeight="500" color="whiteAlpha.900">
                            Multi-channel delivery
                        </Text>
                    </Flex>
                </Grid>

                <Stack gap="md" pt="sm" w="100%">
                    <Box h="180px" borderRadius="lg" borderWidth="1px" borderStyle="dashed" borderColor="whiteAlpha.300" bg="whiteAlpha.50" />
                    <Box h="120px" borderRadius="lg" borderWidth="1px" borderStyle="dashed" borderColor="whiteAlpha.300" bg="whiteAlpha.50" />
                </Stack>
            </Stack>
        </Flex>
    );
}
