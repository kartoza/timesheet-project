import '../styles/TimeLogTable.scss';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Container,
    Divider,
    Grid,
    IconButton,
    Typography
} from "@mui/material";
import {theme, generateColor} from "../utils/Theme";
import {TimeLog, useDeleteTimeLogMutation} from "../services/api";
import moment from "moment";
import React, {useEffect, useState} from "react";

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
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    // @ts-ignore
    const open = Boolean(anchorEl);

    const getTime = ( date : string ) => {
        return moment(date, 'YYYY-MM-DD hh:mm').format('hh:mm A')
    }

    const calculateHours = (fromTime: string) => {
        let fromTimeObj = moment(fromTime, 'YYYY-MM-DD hh:mm')
        return moment.duration(moment().diff(fromTimeObj)).asHours().toFixed(2)
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
        handleClose();
        if (confirm('Are you sure you want to delete this record?')) {
            deleteTimeLog({
               'id': prop.id
            })
        }
    }

    const editTimeLogClicked = () => {
        handleClose();
        prop.edit_button_clicked(prop);
    }

    const copyTimeLogClicked = () => {
        handleClose();
        prop.copy_button_clicked(prop);
    }

    const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    }

    const handleClose = () => {
        setAnchorEl(null);
    }

    return (
        <Grid container spacing={1} className="time-log-row">
            <Grid className="time-log-item left-item" item xs={12} md={8.5}>
                <div>
                    <Typography variant={"subtitle2"} color="text.secondary" sx={{ display: "inline-block", marginRight: prop.task_name ? '10px' : '0' }}>
                        { prop.task_name }
                    </Typography>
                    <Typography className="activity-type" color="text.primary">
                        { prop.activity_type }
                    </Typography>
                </div>
                <div style={{display: "flex"}}>
                    <Typography sx={{ display: "inline-block", fontWeight: "bold", whiteSpace: "pre-line"}}>
                        { prop.description ? prop.description : '-' }</Typography>
                    <Typography sx={{ display: "inline-block", paddingLeft: 1, color: generateColor(prop.project_name) }}>
                        {bull} { prop.project_name }
                    </Typography>
                </div>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item"  item xs={1.8} sx={{ fontSize: "0.85em", letterSpacing: 0.8 }}>
                { getTime(prop.from_time) } { !prop.running ? '- ' + getTime(prop.to_time) : '' }
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item" item xs={1}>
                <Typography sx={{ fontSize: "1.1em", textWeight: "bold" }} color="text.primary" variant="button">
                    { !prop.running ? prop.hours : calculateHours(prop.from_time) }
                </Typography>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item" item xs={0.6}>
                <Button
                    style={{ marginLeft: '8px' }}
                    aria-controls={open ? 'basic-menu' : undefined}
                    aria-expanded={open ? 'true': undefined}
                    aria-label="delete"
                    variant={'text'}
                    size={"small"}
                    onClick={openMenu}
                    disabled={loading}
                >
                    <MoreVertIcon/>
                </Button>
                <Menu
                    disableAutoFocusItem={true}
                    id="basic-menu"
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                        'aria-labelledby': 'basic-button',
                    }}
                >
                    <MenuItem onClick={deleteTimeLogClicked}><DeleteSweepIcon/></MenuItem>
                    <MenuItem onClick={editTimeLogClicked}><EditIcon/></MenuItem>
                    <MenuItem onClick={copyTimeLogClicked}><ContentCopyIcon/></MenuItem>
                </Menu>
            </Grid>
        </Grid>
    )
}

function TimeLogTable(props: any) {
    const { data, date, editTimeLog, copyTimeLog } = props;

    const totalHours = () => {
        let _totalHours = 0;
        for (const timeLogData of data) {
            _totalHours += parseFloat(timeLogData.hours)
        }
        return _totalHours;
    }

    const dateString = () => {
        return new Date(Date.parse(date)).toDateString()
    }

    const onEditButtonClicked = (timelog: TimeLog) => {
        editTimeLog(timelog);
    }

    const onCopyButtonClicked = (timelog: TimeLog) => {
        copyTimeLog(timelog);
    }

    return (
        <Container maxWidth="lg">
            <Card>
                <CardHeader
                    title={ dateString() }
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
                    {data.map((timeLogData: TimeLog) => {
                      if (!timeLogData.running) {
                        return (
                          <div key={timeLogData.id}>
                            <TimeLogItem {...timeLogData} edit_button_clicked={onEditButtonClicked} copy_button_clicked={onCopyButtonClicked}/>
                            <Divider sx={{marginBottom: 1}}/>
                          </div>
                        )
                      } else {
                        return null;
                      }
                    })}
                </CardContent>
            </Card>

        </Container>
    )
}


export default TimeLogTable;
