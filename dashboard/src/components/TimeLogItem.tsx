import {TimeLog} from "../services/api";
import React, {useState} from "react";
import moment from "moment/moment";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import {generateColor, getColorFromTaskLabel} from "../utils/Theme";
import {
    AssignmentIcon,
    ContentCopyIcon,
    DeleteSweepIcon,
    EditIcon,
    EngineeringIcon,
    MoreVertIcon,
    TaskAltIcon
} from "../loadable/Icon";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import TButton from "../loadable/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {cloneTimeLogSignal, deleteTimeLogSignal, editTimeLogSignal, resumeTimeLogSignal} from "../utils/sharedSignals";


export function TimeLogItem(prop : TimeLog)    {
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
        deleteTimeLogSignal.value(prop, true);
    }

    const editTimeLogClicked = () => {
        handleClose();
        editTimeLogSignal.value(prop);
    }

    const copyTimeLogClicked = () => {
        handleClose();
        cloneTimeLogSignal.value(prop);
    }

    const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    }

    const handleClose = () => {
        setAnchorEl(null);
    }

    const resumeTimeLogClicked = () => {
        handleClose();
        resumeTimeLogSignal.value(prop);
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
