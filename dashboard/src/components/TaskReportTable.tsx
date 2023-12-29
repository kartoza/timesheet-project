import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import Typography from "@mui/material/Typography";
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
                          {
                            props.data[data].hasOwnProperty('summary') ? <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '0 20px',
                              marginTop: -55
                            }}>
                              <Typography align={'left'}>
                              </Typography>
                              <Typography align={'right'}>
                                Allocated: {props.data[data]['summary']['allocated_hours']}
                                <br/>
                                Used: {props.data[data]['summary']['used_hours']}
                              </Typography>
                            </div> : null
                          }
                          <Table>
                            <TableHead>
                              <TableCell width={'50%'}>Name</TableCell>
                              <TableCell>Total Hours</TableCell>
                            </TableHead>
                            <TableBody>
                              {Object.keys(props.data[data]).map((taskData) => (
                                taskData !== 'summary' ?
                                  <TableRow>
                                  <TableCell>
                                                  {taskData}
                                              </TableCell>
                                              <TableCell>
                                                  {props.data[data][taskData].toFixed(2)}
                                              </TableCell>
                                          </TableRow> : null
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
