import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";

export const UserReportTable = (props : any) => {
   return (
       <TableContainer component={Paper} style={{ marginBottom: '2em' }}>
          <Table>
             <TableHead>
                <TableCell width={250}>Name</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Total Billable Hours</TableCell>
                <TableCell>Utilization Rate (%)</TableCell>
             </TableHead>
             <TableBody>
                {Object.keys(props.data['total_hours']).map((data) => (
                    <TableRow>
                       <TableCell>
                          {data}
                       </TableCell>
                       <TableCell>
                          {props.data['total_hours'][data].toFixed(2)}
                       </TableCell>
                       <TableCell>
                          {props.data['total_billable_hours'][data].toFixed(2)}
                       </TableCell>
                       <TableCell>
                          {props.data['utilization_rate'][data].toFixed(2)}
                       </TableCell>
                    </TableRow>
                ))}
             </TableBody>
          </Table>
       </TableContainer>
   )
}
