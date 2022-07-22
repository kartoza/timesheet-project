import '../styles/TimeLogTable.scss';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CircularProgress from '@mui/material/CircularProgress';
import Fab from '@mui/material/Fab';
import {Box, Card, CardContent, CardHeader, Container, Divider, Grid, IconButton, Typography} from "@mui/material";
import {theme} from "../utils/Theme";
import {ThemeProvider} from "@mui/material/styles";
import {TimeLog, useDeleteTimeLogMutation} from "../services/api";
import moment from "moment";
import {useEffect, useState} from "react";

const bull = (
    <Box
        component="span"
        sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
    >
        •
    </Box>
);

function TimeLogItem(prop : TimeLog) {
    const [deleteTimeLog, { isLoading: isUpdating, isSuccess, isError }] = useDeleteTimeLogMutation();
    const [loading, setLoading] = useState(false);

    const getTime = ( date : string ) => {
        return moment(date, 'YYYY-MM-DD hh:mm').format('hh:mm A')
    }

    useEffect(() => {
        if (isUpdating) {
            setLoading(true)
        }
        if (isSuccess) {
            setLoading(false)
        }
    }, [isUpdating, isSuccess])

    const deleteTimeLogClicked = () => {
        deleteTimeLog({
            'id': prop.id
        })
    }

    return (
        <Grid container spacing={1} className="time-log-row">
            <Grid className="time-log-item left-item" item xs={8.5}>
                <div>
                    <Typography variant={"subtitle2"} color="text.secondary" sx={{ display: "inline-block" }}>
                        { prop.task_name }
                    </Typography>
                    <Typography className="activity-type" color="text.primary">
                        { prop.activity_type }
                    </Typography>
                </div>
                <div style={{display: "flex"}}>
                    <Typography sx={{ display: "inline-block", fontWeight: "bold", whiteSpace: "pre-line"}}>
                        { prop.description ? prop.description : '-' }</Typography>
                    <Typography sx={{ display: "inline-block", paddingLeft: 1 }} color="text.secondary">
                        {bull} { prop.project_name }
                    </Typography>
                </div>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item"  item xs={1.8} sx={{ fontSize: "0.85em", letterSpacing: 0.8 }}>
                { getTime(prop.from_time) } - { getTime(prop.to_time) }
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item" item xs={1}>
                <Typography sx={{ fontSize: "1.1em", textWeight: "bold" }} color="text.primary" variant="button">
                    { prop.hours }
                </Typography>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item" item xs={0.6}>
                <ThemeProvider theme={theme}>
                    <Fab
                        aria-label="delete"
                        color="warning"
                        size={"small"}
                        onClick={deleteTimeLogClicked}
                        sx={{ marginLeft: '20px' }}
                        disabled={loading}
                    >
                        <DeleteSweepIcon/>
                    </Fab>
                    { loading ?
                    <CircularProgress size={45} sx={{
                        position: 'absolute',
                        marginTop: -5.3,
                        marginLeft: -1.4,
                        zIndex: 99,
                    }} /> : null }
                </ThemeProvider>
            </Grid>
        </Grid>
    )
}

function TimeLogTable(props: any) {
    const { data, date } = props;

    const totalHours = () => {
        let _totalHours = 0;
        for (const timeLogData of data) {
            _totalHours += parseFloat(timeLogData.hours)
        }
        return _totalHours;
    }

    return (
        <Container maxWidth="lg">
            <Card>
                <CardHeader
                    title={ date }
                    subheader={ 'Total: ' + totalHours() }
                    className={ 'timelog-card-header' }
                    sx={{
                        textAlign: 'left',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                        marginBottom: '10px',
                        backgroundColor: '#1D575C',
                        display: 'flex'
                    }}
                    titleTypographyProps={{
                        'color': 'text.secondary',
                        'sx': {fontSize: '14px', color: 'white', marginTop: 0.5}
                    }}
                    subheaderTypographyProps={{
                        'color': 'white',
                        'sx': {marginLeft: "auto"}
                    }}
                />
                <CardContent sx={{padding: 0}}>
                    {data.map((timeLogData: TimeLog) => (
                        <div>
                            <TimeLogItem {...timeLogData} />
                            <Divider sx={{marginBottom: 1}}/>
                        </div>
                    ))}
                </CardContent>
            </Card>

        </Container>
    )
}


export default TimeLogTable;
