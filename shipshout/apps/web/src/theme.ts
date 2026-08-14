import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const gray = {
    25: { value: '#fcfcfd' },
    50: { value: '#f9fafb' },
    100: { value: '#f2f4f7' },
    200: { value: '#e4e7ec' },
    300: { value: '#d0d5dd' },
    400: { value: '#98a2b3' },
    500: { value: '#667085' },
    600: { value: '#475467' },
    700: { value: '#344054' },
    800: { value: '#1d2939' },
    900: { value: '#101828' },
    950: { value: '#0c111d' },
};

const brand = {
    25: { value: '#f2f7ff' },
    50: { value: '#ecf3ff' },
    100: { value: '#dde9ff' },
    200: { value: '#c2d6ff' },
    300: { value: '#9cb9ff' },
    400: { value: '#7592ff' },
    500: { value: '#465fff' },
    600: { value: '#3641f5' },
    700: { value: '#2a31d8' },
    800: { value: '#252dae' },
    900: { value: '#262e89' },
    950: { value: '#161950' },
};

const success = {
    25: { value: '#f6fef9' },
    50: { value: '#ecfdf3' },
    100: { value: '#d1fadf' },
    200: { value: '#a6f4c5' },
    300: { value: '#6ce9a6' },
    400: { value: '#32d583' },
    500: { value: '#12b76a' },
    600: { value: '#039855' },
    700: { value: '#027a48' },
    800: { value: '#05603a' },
    900: { value: '#054f31' },
    950: { value: '#053321' },
};

const error = {
    25: { value: '#fffbfa' },
    50: { value: '#fef3f2' },
    100: { value: '#fee4e2' },
    200: { value: '#fecdca' },
    300: { value: '#fda29b' },
    400: { value: '#f97066' },
    500: { value: '#f04438' },
    600: { value: '#d92d20' },
    700: { value: '#b42318' },
    800: { value: '#912018' },
    900: { value: '#7a271a' },
    950: { value: '#55160c' },
};

const warning = {
    25: { value: '#fffcf5' },
    50: { value: '#fffaeb' },
    100: { value: '#fef0c7' },
    200: { value: '#fedf89' },
    300: { value: '#fec84b' },
    400: { value: '#fdb022' },
    500: { value: '#f79009' },
    600: { value: '#dc6803' },
    700: { value: '#b54708' },
    800: { value: '#93370d' },
    900: { value: '#7a2e0e' },
    950: { value: '#4e1d09' },
};

const orange = {
    25: { value: '#fffaf5' },
    50: { value: '#fff6ed' },
    100: { value: '#ffead5' },
    200: { value: '#fddcab' },
    300: { value: '#feb273' },
    400: { value: '#fd853a' },
    500: { value: '#fb6514' },
    600: { value: '#ec4a0a' },
    700: { value: '#c4320a' },
    800: { value: '#9c2a10' },
    900: { value: '#7e2410' },
    950: { value: '#511c10' },
};

const config = defineConfig({
    globalCss: {
        body: {
            bg: 'bg',
            color: 'fg',
            fontFamily: 'body',
        },
        '.dark [data-variant="outline"]:hover:not(:disabled)': {
            borderColor: 'border.emphasized',
            bg: 'bg.emphasized',
        },
        '.dark [data-variant="ghost"]:hover:not(:disabled)': {
            bg: 'bg.emphasized',
        },
    },
    theme: {
        tokens: {
            colors: { gray, brand, success, error, warning, orange },
            fonts: {
                heading: { value: 'var(--font-outfit), sans-serif' },
                body: { value: 'var(--font-outfit), sans-serif' },
            },
            radii: {
                lg: { value: '8px' },
                '2xl': { value: '16px' },
            },
            shadows: {
                'theme-xs': { value: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)' },
                'theme-sm': { value: '0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)' },
                'theme-md': { value: '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)' },
                'theme-lg': { value: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)' },
                'theme-xl': { value: '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)' },
            },
        },
        semanticTokens: {
            colors: {
                bg: { value: { _light: '{colors.gray.50}', _dark: '{colors.gray.900}' } },
                fg: { value: { _light: '{colors.gray.900}', _dark: 'rgba(255,255,255,0.9)' } },
                'fg.muted': { value: { _light: '{colors.gray.500}', _dark: '{colors.gray.400}' } },
                'fg.subtle': { value: { _light: '{colors.gray.400}', _dark: '{colors.gray.500}' } },
                border: { value: { _light: '{colors.gray.200}', _dark: '{colors.gray.800}' } },
                'bg.muted': { value: { _light: '{colors.gray.100}', _dark: 'rgba(255,255,255,0.05)' } },
                'bg.emphasized': { value: { _light: '{colors.gray.100}', _dark: 'rgba(255,255,255,0.1)' } },
                'border.emphasized': { value: { _light: '{colors.gray.300}', _dark: 'rgba(255,255,255,0.2)' } },
                brand: {
                    solid: { value: '{colors.brand.500}' },
                    contrast: { value: 'white' },
                    fg: { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.400}' } },
                    muted: { value: { _light: '{colors.brand.50}', _dark: 'rgba(70, 95, 255, 0.12)' } },
                    subtle: { value: { _light: '{colors.brand.100}', _dark: '{colors.brand.900}' } },
                    emphasized: { value: { _light: '{colors.brand.300}', _dark: '{colors.brand.800}' } },
                    focusRing: { value: '{colors.brand.500}' },
                },
            },
        },
    },
});

export const system = createSystem(defaultConfig, config);
