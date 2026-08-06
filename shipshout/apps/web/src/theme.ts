import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
    globalCss: {
        '.dark [data-variant="outline"]:hover:not(:disabled)': {
            borderColor: 'border.emphasized',
            bg: 'bg.emphasized',
        },
        '.dark [data-variant="ghost"]:hover:not(:disabled)': {
            bg: 'bg.emphasized',
        },
    },
    theme: {
        keyframes: {
            pulseRing: {
                '0%': { transform: 'scale(0.8)', opacity: '0.7' },
                '80%': { transform: 'scale(1.8)', opacity: '0' },
                '100%': { transform: 'scale(1.8)', opacity: '0' },
            },
        },
        tokens: {
            colors: {
                ink: { value: '#0E1420' },
                paper: { value: '#F7F7F5' },
                cloud: { value: '#E7E9EE' },
                slate: { value: '#6B7280' },
                signal: {
                    50: { value: '#EFF6FF' },
                    100: { value: '#DBEAFE' },
                    200: { value: '#BFDBFE' },
                    300: { value: '#93C5FD' },
                    400: { value: '#3B82F6' },
                    500: { value: '#2563EB' },
                    600: { value: '#1D4ED8' },
                    700: { value: '#1E40AF' },
                    800: { value: '#1E3A8A' },
                    900: { value: '#172554' },
                    950: { value: '#0F1D3D' },
                },
                beacon: {
                    50: { value: '#EDFCFA' },
                    100: { value: '#D2F7F1' },
                    200: { value: '#A8EEE3' },
                    300: { value: '#74E0D2' },
                    400: { value: '#3DC9BC' },
                    500: { value: '#0EA5A0' },
                    600: { value: '#0B8683' },
                    700: { value: '#0A6B69' },
                    800: { value: '#0A5453' },
                    900: { value: '#0A4342' },
                    950: { value: '#052625' },
                },
            },
            fonts: {
                heading: { value: 'var(--font-heading), sans-serif' },
                body: { value: 'var(--font-body), sans-serif' },
                mono: { value: 'var(--font-mono), monospace' },
            },
            animations: {
                pulseRing: { value: 'pulseRing 2.2s ease-out infinite' },
            },
        },
        semanticTokens: {
            colors: {
                bg: { value: { _light: '{colors.paper}', _dark: '{colors.ink}' } },
                fg: { value: { _light: '{colors.ink}', _dark: '{colors.paper}' } },
                border: { value: { _light: '{colors.cloud}', _dark: '{colors.whiteAlpha.200}' } },
                'bg.emphasized': {
                    value: { _light: '{colors.gray.100}', _dark: '{colors.whiteAlpha.100}' },
                },
                'border.emphasized': {
                    value: { _light: '{colors.gray.300}', _dark: '{colors.whiteAlpha.300}' },
                },
                signal: {
                    solid: { value: '{colors.signal.500}' },
                    contrast: { value: 'white' },
                    fg: { value: { _light: '{colors.signal.700}', _dark: '{colors.signal.300}' } },
                    muted: { value: { _light: '{colors.signal.100}', _dark: '{colors.signal.950}' } },
                    subtle: { value: { _light: '{colors.signal.200}', _dark: '{colors.signal.900}' } },
                    emphasized: { value: { _light: '{colors.signal.300}', _dark: '{colors.signal.800}' } },
                    focusRing: { value: '{colors.signal.500}' },
                },
                beacon: {
                    solid: { value: '{colors.beacon.500}' },
                    contrast: { value: 'white' },
                    fg: { value: { _light: '{colors.beacon.700}', _dark: '{colors.beacon.300}' } },
                    muted: { value: { _light: '{colors.beacon.100}', _dark: '{colors.beacon.950}' } },
                    subtle: { value: { _light: '{colors.beacon.200}', _dark: '{colors.beacon.900}' } },
                    emphasized: { value: { _light: '{colors.beacon.300}', _dark: '{colors.beacon.800}' } },
                    focusRing: { value: '{colors.beacon.500}' },
                },
            },
        },
    },
});

export const system = createSystem(defaultConfig, config);
