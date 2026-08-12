import type { createToaster } from '@chakra-ui/react';

export type ToastInput = {
    title: string;
    description?: string;
    duration?: number;
};

type ToasterApi = ReturnType<typeof createToaster>;

export type ToastAppearance = {
    palette: 'green' | 'red' | 'blue' | 'orange' | 'gray';
    bg: string;
    borderColor: string;
    accentColor: string;
    titleColor: string;
    descriptionColor: string;
};

export class Toaster {
    private static api: ToasterApi | null = null;

    static bind(api: ToasterApi): void {
        Toaster.api = api;
    }

    static appearance(type: string | undefined): ToastAppearance {
        if (type === 'success')
            return {
                palette: 'green',
                bg: 'green.subtle',
                borderColor: 'green.muted',
                accentColor: 'green.solid',
                titleColor: 'green.fg',
                descriptionColor: 'fg.muted',
            };
        if (type === 'error')
            return {
                palette: 'red',
                bg: 'red.subtle',
                borderColor: 'red.muted',
                accentColor: 'red.solid',
                titleColor: 'red.fg',
                descriptionColor: 'fg.muted',
            };
        if (type === 'warning')
            return {
                palette: 'orange',
                bg: 'orange.subtle',
                borderColor: 'orange.muted',
                accentColor: 'orange.solid',
                titleColor: 'orange.fg',
                descriptionColor: 'fg.muted',
            };
        if (type === 'info' || type === 'loading')
            return {
                palette: 'blue',
                bg: 'blue.subtle',
                borderColor: 'blue.muted',
                accentColor: 'blue.solid',
                titleColor: 'blue.fg',
                descriptionColor: 'fg.muted',
            };
        return {
            palette: 'gray',
            bg: 'bg.surface',
            borderColor: 'border.hairline',
            accentColor: 'fg.muted',
            titleColor: 'fg',
            descriptionColor: 'fg.muted',
        };
    }

    static success(input: ToastInput): void {
        Toaster.api?.success({
            title: input.title,
            description: input.description,
            duration: input.duration ?? 4000,
        });
    }

    static error(input: ToastInput): void {
        Toaster.api?.error({
            title: input.title,
            description: input.description,
            duration: input.duration ?? 6000,
        });
    }

    static info(input: ToastInput): void {
        Toaster.api?.info({
            title: input.title,
            description: input.description,
            duration: input.duration ?? 4000,
        });
    }
}
