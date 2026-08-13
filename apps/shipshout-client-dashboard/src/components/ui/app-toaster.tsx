'use client';

import { CloseButton, Portal, Show, Stack, createToaster, Toaster as ChakraToaster, Toast } from '@chakra-ui/react';
import { Toaster } from '@/lib/feedback/toaster.utils';

const toasterApi = createToaster({
    placement: 'bottom-end',
    pauseOnPageIdle: true,
    overlap: true,
    max: 3,
});

Toaster.bind(toasterApi);

export function AppToaster() {
    return (
        <Portal>
            <ChakraToaster toaster={toasterApi} insetInline={{ mdDown: '4' }} insetBlockEnd="6" insetInlineEnd="6">
                {(toast) => {
                    const style = Toaster.appearance(toast.type);
                    return (
                        <Toast.Root
                            width={{ base: 'full', md: 'sm' }}
                            bg={style.bg}
                            borderWidth="1px"
                            borderColor={style.borderColor}
                            borderLeftWidth="3px"
                            borderLeftColor={style.accentColor}
                            borderRadius="xl"
                            boxShadow="md"
                            fontSize="sm"
                            alignItems="flex-start"
                            py="sm"
                            px="md"
                        >
                            <Toast.Indicator colorPalette={style.palette} />
                            <Stack gap="0.5" flex="1" maxWidth="100%" minW="0">
                                <Show when={toast.title}>
                                    <Toast.Title fontWeight="600" color={style.titleColor} lineHeight="1.4">
                                        {toast.title}
                                    </Toast.Title>
                                </Show>
                                <Show when={toast.description}>
                                    <Toast.Description color={style.descriptionColor} fontSize="sm" lineHeight="1.43">
                                        {toast.description}
                                    </Toast.Description>
                                </Show>
                            </Stack>
                            <Toast.CloseTrigger asChild>
                                <CloseButton size="sm" variant="ghost" color={style.titleColor} />
                            </Toast.CloseTrigger>
                        </Toast.Root>
                    );
                }}
            </ChakraToaster>
        </Portal>
    );
}
