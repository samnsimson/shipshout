"use client"

import {
  Toaster as ChakraToaster,
  Portal,
  Show,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react"

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
})

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => (
          <Toast.Root width={{ md: "sm" }}>
            <Show when={toast.type === "loading"} fallback={<Toast.Indicator />}>
              <Spinner size="sm" color="blue.solid" />
            </Show>
            <Stack gap="1" flex="1" maxWidth="100%">
              <Show when={toast.title}>
                {(title) => <Toast.Title>{title}</Toast.Title>}
              </Show>
              <Show when={toast.description}>
                {(description) => <Toast.Description>{description}</Toast.Description>}
              </Show>
            </Stack>
            <Show when={toast.action}>
              {(action) => <Toast.ActionTrigger>{action.label}</Toast.ActionTrigger>}
            </Show>
            <Show when={toast.closable}>
              <Toast.CloseTrigger />
            </Show>
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
