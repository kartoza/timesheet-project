import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        neutral: {
            main: '#64748B',
            contrastText: '#fff',
        },
        main: {
            main: '#E66F5C',
            contrastText: '#fff',
        },
        secondary: {
            main: '#d2b726',
            contrastText: '152731'
        },
        success: {
            main: '#4eb747',
            contrastText: '#fff',
        }
    },
});

export const generateColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    return `hsl(${(hash % 360)}, 40%, 25%)`;
}

declare module '@mui/material/styles' {
    interface Palette {
        neutral: Palette['primary'];
        main: Palette['primary'];
        secondary: Palette['primary'];
    }

    // allow configuration using `createTheme`
    interface PaletteOptions {
        neutral?: PaletteOptions['primary'];
        main?: PaletteOptions['primary'];
        secondary?: PaletteOptions['primary'];
    }
}

// Update the Button's color prop options
declare module '@mui/material/Button' {
    interface ButtonPropsColorOverrides {
        neutral: true;
        main: true;
        secondary: true;
    }
}

