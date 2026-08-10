import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
    theme: {
        tokens: {
            colors: {
                brand: {
                    50: { value: '#e6f2ff' },
                    100: { value: '#cce5ff' },
                    200: { value: '#99caff' },
                    300: { value: '#66b0f5' },
                    400: { value: '#3395eb' },
                    500: { value: '#0075de' },
                    600: { value: '#005bab' },
                    700: { value: '#004682' },
                    800: { value: '#213183' },
                    900: { value: '#001a33' },
                    950: { value: '#000d1a' },
                },
                canvas: {
                    DEFAULT: { value: '#ffffff' },
                    soft: { value: '#f6f5f4' },
                },
                ink: {
                    DEFAULT: { value: '#000000' },
                    secondary: { value: '#31302e' },
                    muted: { value: '#615d59' },
                    faint: { value: '#a39e98' },
                },
                hairline: { value: '#e6e6e6' },
            },
            fonts: {
                heading: { value: 'var(--font-inter), Inter, system-ui, sans-serif' },
                body: { value: 'var(--font-inter), Inter, system-ui, sans-serif' },
            },
            spacing: {
                xxs: { value: '4px' },
                xs: { value: '8px' },
                sm: { value: '12px' },
                md: { value: '16px' },
                lg: { value: '24px' },
                xl: { value: '28px' },
                xxl: { value: '32px' },
            },
            radii: {
                xs: { value: '4px' },
                sm: { value: '5px' },
                md: { value: '8px' },
                lg: { value: '12px' },
                xl: { value: '16px' },
                full: { value: '9999px' },
            },
        },
        semanticTokens: {
            colors: {
                brand: {
                    solid: { value: '{colors.brand.500}' },
                    contrast: { value: '{colors.brand.50}' },
                    fg: { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.300}' } },
                    muted: { value: '{colors.brand.100}' },
                    subtle: { value: '{colors.brand.200}' },
                    emphasized: { value: '{colors.brand.300}' },
                    focusRing: { value: '{colors.brand.500}' },
                },
                bg: {
                    canvas: {
                        value: { _light: '{colors.canvas}', _dark: '#1a1918' },
                    },
                    soft: {
                        value: { _light: '{colors.canvas.soft}', _dark: '#121110' },
                    },
                    surface: {
                        value: { _light: '{colors.canvas}', _dark: '#242220' },
                    },
                },
                fg: {
                    DEFAULT: {
                        value: { _light: '{colors.ink}', _dark: '#f5f4f2' },
                    },
                    muted: {
                        value: { _light: '{colors.ink.muted}', _dark: '#a39e98' },
                    },
                    subtle: {
                        value: { _light: '{colors.ink.secondary}', _dark: '#d4d0cb' },
                    },
                },
                border: {
                    hairline: {
                        value: { _light: '{colors.hairline}', _dark: '#3a3835' },
                    },
                },
            },
        },
    },
    globalCss: {
        body: {
            bg: 'bg.soft',
            color: 'fg',
            fontFamily: 'body',
        },
    },
});

export const system = createSystem(defaultConfig, config);
