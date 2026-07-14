import {TimeLog, useUpdateTimesheetMutation} from "../services/api";
import React, {useState, Suspense, useEffect, useRef} from "react";
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
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import {cloneTimeLogSignal, deleteTimeLogSignal, editTimeLogSignal, resumeTimeLogSignal, breakTimeLogSignal} from "../utils/sharedSignals";
import {getColorFromTaskLabel, isColorLight} from "../utils/Theme";

const TReactQuill = React.lazy(() => import('./ReactQuill'));


export function TimeLogItem(prop : TimeLog)    {
    const [loading, setLoading] = useState(false);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const { mode } = useColorScheme();
    const metaColor = mode === 'dark' ? '#bdbdbd' : '#424242';
    // @ts-ignore
    const open = Boolean(anchorEl);

    const [updateTimesheet, { isLoading: isSaving }] = useUpdateTimesheetMutation();

    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionValue, setDescriptionValue] = useState('');
    const descriptionEditorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!editingDescription) return;

        setTimeout(() => {
            const editor = descriptionEditorRef.current?.querySelector<HTMLElement>('.ql-editor');
            if (editor) {
                editor.focus();
                const range = document.createRange();
                range.selectNodeContents(editor);
                range.collapse(false);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
        }, 50);

        const handleMouseDown = (e: MouseEvent) => {
            if (descriptionEditorRef.current && !descriptionEditorRef.current.contains(e.target as Node)) {
                setEditingDescription(false);
                setDescriptionValue('');
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [editingDescription]);

    // Meta (activity / project / task)
    const [activities, setActivities] = useState<any[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<any>(
        prop.activity_id ? { id: prop.activity_id, label: prop.activity_type } : null
    );
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<any>(
        prop.project_id ? { id: prop.project_id, label: prop.project_name } : null
    );
    const [projectInput, setProjectInput] = useState('');
    const [projectLoading, setProjectLoading] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [selectedTask, setSelectedTask] = useState<any>(
        prop.task_id ? { id: prop.task_id, label: prop.task_name } : null
    );

    useEffect(() => {
        fetch('/api/activity-list/').then(r => r.json()).then(setActivities);
        if (prop.project_id) {
            fetch(`/api/task-list/${prop.project_id}/`).then(r => r.json()).then(json => {
                const coloredTasks = json.map((d: any) => ({ ...d, color: getColorFromTaskLabel(d.label) }));
                setTasks(coloredTasks);
                if (prop.task_id) {
                    const matched = coloredTasks.find((t: any) => t.id == prop.task_id);
                    if (matched) setSelectedTask(matched);
                }
            });
        }
    }, []);

    useEffect(() => {
        if (projectInput.length <= 1) return;
        setProjectLoading(true);
        fetch('/api/project-list/?q=' + projectInput)
            .then(r => r.json())
            .then(json => { setProjects(json); setProjectLoading(false); });
    }, [projectInput]);

    const saveMetaWith = async (activity: any, project: any, task: any) => {
        if (!task) return;
        try {
            await updateTimesheet({
                id: prop.id,
                task: { id: task.id || '-' },
                activity: { id: activity?.id || prop.activity_id },
                project: { id: project?.id || '' },
                description: prop.description || '',
                start_time: prop.from_time,
                end_time: prop.to_time || null,
                is_paused: prop.is_paused,
                editing: !!prop.to_time,
            }).unwrap();
        } catch (e) {
            console.error('Failed to save meta', e);
        }
    };

    const onActivityChange = (value: any) => {
        setSelectedActivity(value);
        saveMetaWith(value, selectedProject, selectedTask);
    };

    const onProjectChange = (value: any) => {
        setSelectedProject(value);
        setSelectedTask(null);
        setTasks([]);
        if (value) {
            fetch(`/api/task-list/${value.id}/`).then(r => r.json()).then(json => {
                setTasks(json.map((d: any) => ({ ...d, color: getColorFromTaskLabel(d.label) })));
            });
        }
        // don't save yet — wait for task selection
    };

    const onTaskChange = (value: any) => {
        setSelectedTask(value);
        saveMetaWith(selectedActivity, selectedProject, value);
    };

    // Width follows the selected label so the input doesn't feel like a fixed box
    const labelWidth = (label?: string) => {
        console.log('DEBUG - labelWidth', `${label?.length}px`);
        return label ? `${label.length*0.5 + 1.75}em` : '5em';
    }

    const editableBg = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    // Shared input sx for inline text-like autocomplete
    const inlineInputSx = (label?: string, withBg = false) => ({
        width: labelWidth(label),

        paddingRight: 0,

        '& .MuiInputBase-input': {
            color: metaColor,
            fontSize: '0.875rem',
            padding: withBg ? '1px 4px !important' : '0 !important',
            cursor: 'pointer',
            backgroundColor: withBg ? editableBg : 'transparent',
            borderRadius: withBg ? '2px' : 0,
        },
        '& .MuiInput-root': {
            '&:before': { display: 'none' },
            '&:after': { display: 'none' },
        },
        '& .MuiSvgIcon-root': { color: metaColor, fontSize: '1rem', paddingRight: 0 },
        '& .MuiAutocomplete-endAdornment': { position: 'absolute' as const, top: 10 },
        '& .MuiInput-root.MuiInputBase-sizeSmall': {paddingRight: 0},
    });

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

    // Description editing
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

                {/* Activity / Project / Task */}
                {prop.submitted ? (
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
                ) : (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, fontSize: '0.875rem' }}>
                            {/* Activity */}
                            <Autocomplete
                                disableClearable
                                disablePortal
                                size="small"
                                options={activities}
                                getOptionLabel={(o: any) => o.label}
                                isOptionEqualToValue={(o: any, v: any) => o.id == v.id}
                                value={selectedActivity}
                                onChange={(_, value) => onActivityChange(value)}
                                sx={inlineInputSx(selectedActivity?.label, true)}
                                componentsProps={{ paper: { sx: { minWidth: 220 } } }}
                                renderInput={(params) => (
                                    <TextField {...params} variant="standard"
                                        placeholder="Activity"
                                        InputProps={{ ...params.InputProps, disableUnderline: true }}
                                    />
                                )}
                            />
                            <span style={{ color: metaColor, opacity: 0.5 }}></span>
                            {/* Project */}
                            <Autocomplete
                                disableClearable
                                disablePortal
                                size="small"
                                options={projects}
                                getOptionLabel={(o: any) => o.label}
                                isOptionEqualToValue={(o: any, v: any) => o.id == v.id}
                                value={selectedProject}
                                onInputChange={(_, value) => setProjectInput(value)}
                                onChange={(_, value) => onProjectChange(value)}
                                loading={projectLoading}
                                sx={inlineInputSx(selectedProject?.label, true)}
                                componentsProps={{ paper: { sx: { minWidth: 280 } } }}
                                renderInput={(params) => (
                                    <TextField {...params} variant="standard"
                                        placeholder="Project"
                                        InputProps={{
                                            ...params.InputProps,
                                            disableUnderline: true,
                                            endAdornment: (
                                                <>
                                                    {projectLoading ? <CircularProgress color="inherit" size={12} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />
                            <span style={{ color: metaColor, opacity: 0.5 }}></span>
                            {/* Task */}
                            <Autocomplete
                                disableClearable
                                disablePortal
                                size="small"
                                options={tasks}
                                getOptionLabel={(o: any) => o.label}
                                isOptionEqualToValue={(o: any, v: any) => o.id == v.id}
                                value={selectedTask}
                                componentsProps={{ paper: { sx: { minWidth: 280 } } }}
                                onChange={(_, value) => onTaskChange(value)}
                                renderOption={(props, option) => {
                                    const bg = option.color || 'rgba(255,255,255,1)';
                                    const color = isColorLight(bg) ? '#000' : '#fff';
                                    return <li {...props} style={{ backgroundColor: bg, color }}>{option.label}</li>;
                                }}
                                sx={{
                                    ...inlineInputSx(selectedTask?.label),
                                    '& .MuiInputBase-input': {
                                        ...inlineInputSx(selectedTask?.label)['& .MuiInputBase-input'],
                                        backgroundColor: selectedTask?.color || 'transparent',
                                        color: selectedTask?.color
                                            ? (isColorLight(selectedTask.color) ? '#000' : '#fff')
                                            : metaColor,
                                        padding: selectedTask?.color ? '1px 4px !important' : '0 !important',
                                        borderRadius: '2px',
                                    },
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} variant="standard"
                                        placeholder="Task"
                                        InputProps={{ ...params.InputProps, disableUnderline: true }}
                                    />
                                )}
                            />
                            { !prop.project_active ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: 'red',
                                    color: 'white',
                                    padding: '1px 8px',
                                    fontSize: '0.75rem',
                                }}>
                                    Project Inactive
                                </div>) : null }
                        </div>
                    </div>
                )}

                {/* Description */}
                <div style={{display: "flex", width: '100%', marginTop: 8}}>
                    {editingDescription ? (
                        <div
                            ref={descriptionEditorRef}
                            style={{ width: '100%', border: `1px solid ${metaColor}`, borderRadius: 4, padding: '4px 6px' }}
                        >
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
