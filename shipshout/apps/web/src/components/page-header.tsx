import { Flex, Heading, Show, Text, type FlexProps } from '@chakra-ui/react';

export interface PageHeaderProps extends FlexProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function PageHeader({ title, description, action, ...rest }: PageHeaderProps) {
    return (
        <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap="4" mb="6" {...rest}>
            <Flex direction="column" gap="1">
                <Heading size="lg">{title}</Heading>
                <Show when={description}>
                    {(text) => <Text color="fg.muted">{text}</Text>}
                </Show>
            </Flex>
            <Show when={action}>
                {(content) => <Flex gap="2">{content}</Flex>}
            </Show>
        </Flex>
    );
}
