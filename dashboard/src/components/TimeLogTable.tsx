import '../styles/TimeLogTable.scss';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Card from "@mui/material/Card";
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {generateColor, getColorFromTaskLabel} from "../utils/Theme";
import {TimeLog, useDeleteTimeLogMutation} from "../services/api";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import moment from "moment";
import React, {useEffect, useState} from "react";
import TButton from '../loadable/Button';
import { 
    DeleteSweepIcon, 
    MoreVertIcon, 
    EditIcon, 
    ContentCopyIcon, 
    TaskAltIcon, 
    AssignmentIcon, 
    EngineeringIcon 
} from '../loadable/Icon';
import Chip from "@mui/material/Chip";


function TimeLogItem(prop : TimeLog)    {
    const [loading, setLoading] = useState(false);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    // @ts-ignore
    const open = Boolean(anchorEl);

    const getTime = ( date : string ) => {
        return moment(date, 'YYYY-MM-DD hh:mm').format('HH:mm')
    }

    const calculateHours = (fromTime: string) => {
        let fromTimeObj = moment(fromTime, 'YYYY-MM-DD hh:mm')
        return moment.duration(moment().diff(fromTimeObj)).asHours().toFixed(2)
    }

    const deleteTimeLogClicked = () => {
        handleClose();
        prop.delete_button_clicked(prop);
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

    const resumeTimeLogClicked = () => {
        handleClose();
        prop.resume_button_clicked(prop);
    }

    return (
        <Grid container spacing={1} className={"time-log-row" + (prop.submitted ? " timelog-submitted": "")}>
            <Grid className="time-log-item left-item" item xs={12} md={8}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Paper className="time-log-project" style={{
                        padding: prop.project_name ? '3px 10px' : '0',
                        backgroundColor: generateColor(prop.project_name) }}>
                        <EngineeringIcon style={{ marginRight: 10 }}/>
                        { prop.project_name }
                    </Paper>
                    <Paper className='time-log-task' sx={{
                        backgroundColor: getColorFromTaskLabel(prop.task_name),
                        padding: prop.task_name ? '3px 10px' : '0'}}>
                        { prop.task_name ? <AssignmentIcon/> : null }
                        { prop.task_name } 
                    </Paper>
                    { !prop.project_active ? (
                    <Paper sx={{
                        alignItems: 'center',
                        display: 'flex',
                        textAlign: 'center',
                        backgroundColor: 'red',
                        color: 'white',
                        padding: prop.task_name ? '3px 10px' : '0'}}>
                            Project Inactive
                        </Paper> ) : null }
                </Stack>
                <div style={{display: "flex"}}>
                    <Typography sx={{ display: "inline-block", fontWeight: "bold", whiteSpace: "pre-line"}}>
                        <div dangerouslySetInnerHTML={{__html: prop.description}} />
                    </Typography>
                </div>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item"  item xs={2.8} sx={{ fontSize: "0.85em", letterSpacing: 0.8 }}>
                <Typography sx={{ fontSize: "2em", fontWeight: "bolder" }} color="text.primary">
                    { !prop.running ? prop.all_hours : calculateHours(prop.from_time) }
                    { prop.submitted ? <TaskAltIcon color={'success'} style={{marginLeft: '0.2em'}}/> : null }
                </Typography>
                <div>
                    { prop.total_children > 0 ? <Chip size={'small'} label={prop.total_children + 1} style={{ marginRight: 5 }}/> : ''}
                    { getTime(prop.all_from_time) } { !prop.running ? '- ' + getTime(prop.all_to_time) : '' }
                </div>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
                <Grid className="time-log-item center-item" item xs={0.6}>
                    <TButton
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
                    </TButton>
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
                        <MenuItem onClick={resumeTimeLogClicked}><PlayArrowIcon/></MenuItem>
                        { prop.submitted ? null : <MenuItem onClick={editTimeLogClicked}><EditIcon/></MenuItem> }
                        <MenuItem onClick={copyTimeLogClicked}><ContentCopyIcon/></MenuItem>
                        <MenuItem onClick={deleteTimeLogClicked}><DeleteSweepIcon/></MenuItem>
                    </Menu>
                </Grid>
        </Grid>
    )
}

function TimeLogTable(props: any) {
    const { data, date, editTimeLog, copyTimeLog, resumeTimeLog, deleteTimeLog } = props;

    const totalHours = () => {
        let _totalHours = 0;
        for (const timeLogData of data) {
            _totalHours += parseFloat(timeLogData.hours)
        }
        return _totalHours.toFixed(2);
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

    const onResumeButtonClicked = (timelog: TimeLog) => {
        resumeTimeLog(timelog);
    }

    const onDeleteButtonClicked = (timelog: TimeLog) => {
        deleteTimeLog(timelog);
    }

    return (
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
                  if (!timeLogData.running && !timeLogData.parent) {
                    return (
                      <div key={timeLogData.id}>
                        <TimeLogItem {...timeLogData}
                            edit_button_clicked={onEditButtonClicked}
                            copy_button_clicked={onCopyButtonClicked}
                            resume_button_clicked={onResumeButtonClicked}
                            delete_button_clicked={onDeleteButtonClicked}
                        />
                        <Divider sx={{marginBottom: 1}}/>
                      </div>
                    )
                  } else {
                    return null;
                  }
                })}
            </CardContent>
        </Card>
    )
}


export default TimeLogTable;
