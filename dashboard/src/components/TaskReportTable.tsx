import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Masonry from '@mui/lab/Masonry';


export const TaskReportTable = (props : any) => {
    return (
        <div>
            <Typography align={'left'} color={'text.primary'} variant={'h5'}>
                Employee Task Time Analysis
            </Typography>
            <Typography align={'left'} color={'text.primary'} style={{ marginBottom: 10 }}>
                This report presents a detailed breakdown of hours dedicated by team members to specific tasks.
            </Typography>
            <Masonry columns={2} spacing={2} style={{ marginBottom: '2em' }}>
                {
                    Object.keys(props.data).map((data) => (
                        <TableContainer component={Paper}>
                            <Typography align={'left'} style={{ padding: 20, backgroundColor: 'rgba(116, 116, 116, 0.28)' }}>
                                {data}
                            </Typography>
                            <Table>
                                <TableHead>
                                    <TableCell width={'50%'}>Name</TableCell>
                                    <TableCell>Total Hours</TableCell>
                                </TableHead>
                                <TableBody>
                                    {Object.keys(props.data[data]).map((taskData) => (
                                        <TableRow>
                                            <TableCell>
                                                {taskData}
                                            </TableCell>
                                            <TableCell>
                                                {props.data[data][taskData].toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ))
                }
            </Masonry>
        </div>
    )
}
