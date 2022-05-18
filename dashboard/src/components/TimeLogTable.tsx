import '../styles/TimeLogTable.scss';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import {Box, Card, CardContent, CardHeader, Container, Divider, Grid, IconButton, Typography} from "@mui/material";
import {theme} from "../utils/Theme";
import {ThemeProvider} from "@mui/material/styles";

const bull = (
    <Box
        component="span"
        sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
    >
        •
    </Box>
);

function TimeLogItem() {
    return (
        <Grid container spacing={1} className="time-log-row">
            <Grid className="time-log-item left-item" item xs={8.5}>
                Description here...
                <Typography sx={{ display: "inline-block", paddingLeft: 1 }} color="text.secondary">
                    {bull} Geocontext
                </Typography>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item"  item xs={1.5} sx={{ fontSize: "0.85em", letterSpacing: 0.8 }}>
                3:00PM - 4:08PM
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item" item xs={1}>
                <Typography sx={{ fontSize: "1.1em", textWeight: "bold" }} color="text.primary" variant="button">
                    1.89
                </Typography>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item" item xs={0.9}>
                <ThemeProvider theme={theme}>
                    <IconButton color="secondary" aria-label="upload picture" component="span">
                        <DeleteSweepIcon />
                    </IconButton>
                </ThemeProvider>
            </Grid>
        </Grid>
    )
}

function TimeLogTable() {
    return (
        <Container maxWidth="lg">
            <Card>
                <CardHeader
                    title="Today"
                    sx={{
                        textAlign: 'left',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                        backgroundColor: '#1D575C',
                        marginBottom: '8px'
                    }}
                    titleTypographyProps={{
                        'color': 'text.secondary',
                        'sx': { fontSize: '14px', color: 'white' }
                    }}
                />
                <CardContent sx={{ padding: 0 }}>
                    <TimeLogItem/>
                    <Divider sx={{ marginBottom: 1 }}/>
                    <TimeLogItem/>
                    <Divider sx={{ marginBottom: 1 }}/>
                </CardContent>
            </Card>
        </Container>
    )
}


export default TimeLogTable;
