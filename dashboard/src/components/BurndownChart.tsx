import {useColorScheme} from "@mui/material/styles";
import {Line} from "react-chartjs-2";
import React from "react";

export function BurndownChart(props: any) {
    const { mode, setMode } = useColorScheme();
    const gridColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: mode === 'dark' ? 'white' : 'black',
                },
            },
            title: {
                display: true,
                text: 'Burndown Chart',
            },
        },
        scales: {
            x: {
                grid: {
                    color: gridColor,
                },
                ticks: {
                    color: mode === 'dark' ? 'white' : 'black',
                },
            },
            y: {
                grid: {
                    color: gridColor,
                },
                ticks: {
                    color: mode === 'dark' ? 'white' : 'black',
                },
            },
        },
    };
    return (
        <Line options={chartOptions} data={props.chartData} />
    )
}
