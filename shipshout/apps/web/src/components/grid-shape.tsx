import Image from 'next/image';
import { Box } from '@chakra-ui/react';

export function GridShape() {
    return (
        <>
            <Box position="absolute" top="0" right="0" zIndex="-1" maxW={{ base: '250px', xl: '450px' }} w="full">
                <Image src="/images/shape/grid-01.svg" alt="" width={540} height={254} />
            </Box>
            <Box position="absolute" bottom="0" left="0" zIndex="-1" maxW={{ base: '250px', xl: '450px' }} w="full" transform="rotate(180deg)">
                <Image src="/images/shape/grid-01.svg" alt="" width={540} height={254} />
            </Box>
        </>
    );
}
