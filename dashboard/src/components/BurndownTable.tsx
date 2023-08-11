import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import React from "react";

export function BurndownTable(props: any) {
    const getTotalHours = (rowIndex: any) => {
        let totalHours = 0
        for (const row of props.rows) {
            totalHours += row[rowIndex]
        }
        return totalHours.toFixed(2)
    }

    return (
        props.rows ?
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Week</TableCell>
                            <TableCell>Hours Total</TableCell>
                            <TableCell>Hours Remaining</TableCell>
                            <TableCell>Last Sprint Hours</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {props.rows.map((row) => (
                            <TableRow
                                key={row[0]}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                <TableCell component="th" scope="row">{row[0]}</TableCell>
                                <TableCell>{row[1]}</TableCell>
                                <TableCell>{row[2]}</TableCell>
                                <TableCell>{row[3]}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow key={-1}>
                            <TableCell component="th" scope="row"><strong>Total</strong></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell><strong>{getTotalHours(3)}</strong></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            : null
    );
}
