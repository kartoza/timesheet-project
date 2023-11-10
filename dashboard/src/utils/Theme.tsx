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

export const generateColor = (id: string, brightness = '25%') => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    return `hsl(${(hash % 360)}, 40%, ${brightness})`;
}

export const getTaskColor = (ratio: any) => {
    let green = '99FF33';
    let red = '660000';
    let radix = 16
    if (ratio > 1) {
        ratio = 1;
    }
    let hex = function(x: Number) {
        let xString = x.toString(16) + ''
        return (xString.length == 1) ? '0' + xString : xString
    }
    const r = Math.ceil(parseInt(red.substring(0,2), radix) * ratio + parseInt(green.substring(0,2), radix) * (1-ratio));
    const g = Math.ceil(parseInt(red.substring(2,4), radix) * ratio + parseInt(green.substring(2,4), radix) * (1-ratio));
    const b = Math.ceil(parseInt(red.substring(4,6), radix) * ratio + parseInt(green.substring(4,6), radix) * (1-ratio));
    return '#' + hex(r) + hex(g) + hex(b);
}

export const getColorFromTaskLabel = (taskLabel: any) => {
    const re = /([[+-]?(\d*[.])?\d+(\/)[[+-]?(\d*[.])?\d+)/;
    let taskColor = '#FFFFFF';
    if (taskLabel) {
        try {
            // @ts-ignore
            const times = taskLabel.match(re)[0];
            const timeUsed = parseFloat(times.split('/')[0])
            const timeBudget = parseFloat(times.split('/')[1])
            if (timeUsed >= 0 && timeBudget > 0) {
                taskColor = getTaskColor(timeUsed/timeBudget)
            }
        } catch (e) {
        }
    }
    return taskColor;
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

export const isColorLight = (color) => {
    console.log(color);
    if (!color) return false;
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
};
