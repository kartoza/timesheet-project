import {TimeLog, useUpdateTimesheetMutation} from "../services/api";
import React, {useState, Suspense} from "react";
import moment from "moment/moment";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import {useColorScheme} from "@mui/material/styles";
import {
    BreakIcon,
    ContentCopyIcon,
    DeleteSweepIcon,
    EditIcon,
    MoreVertIcon,
} from "../loadable/Icon";
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import TButton from "../loadable/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {cloneTimeLogSignal, deleteTimeLogSignal, editTimeLogSignal, resumeTimeLogSignal, breakTimeLogSignal} from "../utils/sharedSignals";

const TReactQuill = React.lazy(() => import('./ReactQuill'));


export function TimeLogItem(prop : TimeLog)    {
    const [loading, setLoading] = useState(false);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const { mode } = useColorScheme();
    const metaColor = mode === 'dark' ? '#bdbdbd' : '#424242';
    // @ts-ignore
    const open = Boolean(anchorEl);

    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionValue, setDescriptionValue] = useState('');
    const [updateTimesheet, { isLoading: isSaving }] = useUpdateTimesheetMutation();

    const getTime = ( date : string ) => {
        return moment(date, 'YYYY-MM-DD hh:mm').format('HH:mm')
    }

    const roundHours = (hours: number) => {
        // Source - https://stackoverflow.com/a/11832950
        // Posted by Brian Ustas, modified by community. See post 'Timeline' for change history
        // Retrieved 2026-02-11, License - CC BY-SA 4.0
        let roundedHours = Math.round(hours * 100) / 100
        if (roundedHours == 0) {
            roundedHours = 0.01
        }
        return roundedHours
    }

    const calculateHours = (fromTime: string) => {
        let fromTimeObj = moment(fromTime, 'YYYY-MM-DD hh:mm')
        return moment.duration(moment().diff(fromTimeObj)).asHours().toFixed(2)
    }

    const deleteTimeLogClicked = () => {
        handleClose();
        deleteTimeLogSignal.value(prop, true);
    }

    const breakTimeLogClicked = () => {
        handleClose();
        breakTimeLogSignal.value(prop);
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

    const startEditingDescription = () => {
        setDescriptionValue(prop.description || '');
        setEditingDescription(true);
    };

    const saveDescription = async () => {
        const normalized = descriptionValue === '<p><br></p>' ? '' : descriptionValue;
        try {
            await updateTimesheet({
                id: prop.id,
                task: { id: prop.task_id || '-' },
                activity: { id: prop.activity_id },
                project: { id: prop.project_id || '' },
                description: normalized,
                start_time: prop.from_time,
                end_time: prop.to_time || null,
                is_paused: prop.is_paused,
                editing: !!prop.to_time,
            }).unwrap();
            setEditingDescription(false);
        } catch (e) {
            console.error('Failed to save description', e);
        }
    };

    const cancelEditingDescription = () => {
        setEditingDescription(false);
        setDescriptionValue('');
    };

    return (
        <Grid container spacing={1} className={"time-log-row" + (prop.submitted ? " timelog-submitted": "") + (prop.is_paused ? " timelog-paused": "")}>
            {prop.submitted && <span className="submitted-badge">Submitted</span>}
            <Grid className="time-log-item left-item" item xs={12} md={8}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Typography className="time-log-meta" component="div" sx={{ color: metaColor }}>
                        {[prop.activity_type, prop.project_name, prop.task_name]
                            .filter(Boolean)
                            .map((item, index) => (
                                <React.Fragment key={`${item}-${index}`}>
                                    {index > 0 ? <span className="time-log-separator" style={{ color: metaColor }}> / </span> : null}
                                    <span>{item}</span>
                                </React.Fragment>
                            ))}
                    </Typography>
                    { !prop.project_active ? (
                        <div style={{
                            alignItems: 'center',
                            display: 'flex',
                            textAlign: 'center',
                            backgroundColor: 'red',
                            color: 'white',
                            padding: prop.task_name ? '3px 10px' : '0'}}>
                            Project Inactive
                        </div> ) : null }
                </Stack>
                <div style={{display: "flex", width: '100%'}}>
                    {editingDescription ? (
                        <div style={{ width: '100%', border: `1px solid ${metaColor}`, borderRadius: 4, padding: '4px 6px' }}>
                            <Suspense fallback={null}>
                                <TReactQuill
                                    formats={['bold', 'link', 'strike', 'italic', 'list', 'indent', 'align', 'code-block']}
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'strike', 'blockquote'],
                                            [{'list': 'ordered'}, {'list': 'bullet'}],
                                            ['link'],
                                        ],
                                    }}
                                    value={descriptionValue}
                                    onChange={(value: any) => setDescriptionValue(value)}
                                    style={{ minHeight: 80 }}
                                />
                            </Suspense>
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <TButton size="small" variant="contained" onClick={saveDescription} disabled={isSaving}>
                                    Save
                                </TButton>
                                <TButton size="small" variant="text" onClick={cancelEditingDescription} disabled={isSaving}>
                                    Cancel
                                </TButton>
                            </div>
                        </div>
                    ) : (
                        <Typography
                            sx={{
                                display: "inline-block",
                                fontWeight: "bold",
                                whiteSpace: "pre-line",
                                width: '100%',
                                cursor: !prop.submitted ? 'text' : 'default',
                                borderRadius: 1,
                                padding: '2px 4px',
                                '&:hover': !prop.submitted ? {
                                    outline: '1px dashed',
                                    outlineColor: metaColor,
                                } : {},
                            }}
                            onClick={!prop.submitted ? startEditingDescription : undefined}
                        >
                            {prop.description ? (
                                <div dangerouslySetInnerHTML={{__html: prop.description}} />
                            ) : (
                                !prop.submitted && (
                                    <span style={{ color: metaColor, fontStyle: 'italic', fontWeight: 'normal', opacity: 0.6 }}>
                                        Add description...
                                    </span>
                                )
                            )}
                        </Typography>
                    )}
                </div>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item"  item xs={2.8} sx={{ fontSize: "0.85em", letterSpacing: 0.8 }}>
                <Typography sx={{ fontSize: "2em", fontWeight: "bolder" }} color="text.primary">
                    { !prop.running ? roundHours(parseFloat(prop.all_hours)) : calculateHours(prop.from_time) }
                    { prop.is_paused ? <PauseCircleIcon color={'warning'} style={{marginLeft: '0.2em'}} titleAccess="Paused"/> : null }
                </Typography>
                <div>
                    { prop.total_children > 0 ? <Chip size={'small'} label={prop.total_children + 1} style={{ marginRight: 5 }}/> : ''}
                    { getTime(prop.all_from_time) } { !prop.running ? '- ' + getTime(prop.all_to_time) : '' }
                </div>
            </Grid>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Grid className="time-log-item center-item" item xs={0.6}>
                { !prop.is_paused ? (
                <>
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
                    <MenuItem onClick={resumeTimeLogClicked}><PlayArrowIcon/>{ prop.submitted ? 'Start' : 'Resume' }</MenuItem>
                    { prop.submitted ? null : <MenuItem onClick={editTimeLogClicked}><EditIcon/>Edit</MenuItem> }
                    { prop.submitted ? null : <MenuItem onClick={breakTimeLogClicked}><BreakIcon/>Break</MenuItem> }
                    <MenuItem onClick={copyTimeLogClicked}><ContentCopyIcon/>Copy</MenuItem>
                    <MenuItem onClick={deleteTimeLogClicked}><DeleteSweepIcon/>Delete</MenuItem>
                </Menu>
                </>
                ) : null }
            </Grid>
        </Grid>
    )
}
