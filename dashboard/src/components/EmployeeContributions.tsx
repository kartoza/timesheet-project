import {Box} from "@mui/material";
import Typography from "@mui/material/Typography";
import React from "react";
import {generateUniqueColors} from "../utils/Theme";

export interface EmployeeContributions {
    [name: string]: number
}

interface SliderProps {
    data: EmployeeContributions
}

export const EmployeeContributionsSlider = (props : SliderProps) => {
    let accumulatedValue = 0;
    const marks = Object.values(props.data).map((value, index) => {
        accumulatedValue += value;
        return {
            accumulatedValue: accumulatedValue,
            label: `${Object.keys(props.data)[index]}: ${value.toFixed(2)}%`
        };
    });

    const colors = generateUniqueColors(Object.keys(props.data).length)

    const trackStyle = (label: string) => {
        const index = Object.keys(props.data).indexOf(label.split(':')[0])
        return {
            backgroundColor: (colors && colors[index] ? colors[index] : '#FFFFFF') as string,
            height: 12,
        };
    };

    return (
        <Box>
            <Typography color={'text.primary'} variant={'h5'} align={'left'}>
                Employee Contributions
            </Typography>
            <Typography color={'text.primary'} align={'left'} style={{ marginBottom: 15 }}>
                This visualization represents each employee's contribution to the total billing.
            </Typography>
            <Box
                sx={{
                    position: 'relative',
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: 'lightgrey',
                    marginBottom: 2
                }}
            >
                {marks.map((mark, index) => (
                    <Box
                        key={index}
                        sx={{
                            ...trackStyle(mark.label),
                            position: 'absolute',
                            left: index === 0 ? '0%' : `${marks[index - 1].accumulatedValue}%`,
                            width: `${mark.accumulatedValue - (index === 0 ? 0 : marks[index - 1].accumulatedValue)}%`,
                        }}
                    />
                ))}
            </Box>
            <Box sx={{
                textAlign: 'left',
                marginBottom: 5
            }}>
                {marks.map((mark, index) => (
                    <div style={{ display: 'flex', marginTop: 5 }}>
                        <span style={{
                            width: 30,
                            borderRadius: 25,
                            marginRight: 5,
                            // @ts-ignore
                            backgroundColor: colors && colors[index] ? colors[index] : ''
                        }}>&nbsp;</span>
                        <Typography color={'text.primary'} fontSize={14}>{mark.label}</Typography>
                    </div>
                ))}
            </Box>
        </Box>
    );
}
