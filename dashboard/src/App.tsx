import React, {
    useEffect, useState, Suspense, CSSProperties, useRef, useCallback
} from 'react';
import './styles/App.scss';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Backdrop from '@mui/material/Backdrop';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';

import {generateColor, getColorFromTaskLabel, getTaskColor, isColorLight} from "./utils/Theme";
import {
    TimeLog, useDeleteTimeLogMutation,
    useGetTimeLogsQuery,
    useSubmitTimesheetMutation
} from "./services/api";
import {
    Experimental_CssVarsProvider as CssVarsProvider,
    experimental_extendTheme as extendTheme,
    useColorScheme,
} from '@mui/material/styles';
import TButton from './loadable/Button';
import {
    SettingsIcon,
    SendIcon,
    LightModeIcon,
    DarkModeIcon,
} from './loadable/Icon';
import Loader from './loadable/Loader';
import TimeLogChildList from "./components/TimeLogChildList";
import {cloneTimeLogSignal, deleteTimeLogSignal, editTimeLogSignal, resumeTimeLogSignal} from "./utils/sharedSignals";
import {isTodayInDates} from "./utils/time";

const CircularMenu = React.lazy(() => import('./components/Menu'));
const ReportButton = React.lazy(() => import('./components/ReportButton'));
const Standup = React.lazy(() => import('./components/Standup'));
const TimeCard = React.lazy(() => import('./components/TimeCard'));
const TReactQuill = React.lazy(() => import('./components/ReactQuill'));
const TimeLogTable = React.lazy(() => import("./components/TimeLogTable"));
const ScheduleInfo = React.lazy(() => import("./components/ScheduleInfo"));
const ReactCanvasConfetti = React.lazy(() => import('react-canvas-confetti'));
const UserActivities = React.lazy(() => import('./components/UserActivities'));
const LeaderBoard = React.lazy(() => import('./components/LeaderBoard'));
const unavailableDates = (window as any).unavailableDates;
const randomCompliments = [
    'Nice!',
    'Clocking out like a pro!',
    'Timesheet superstar!',
    'Like clockwork!',
]

export function ModeToggle() {
    const { mode, setMode } = useColorScheme();
    return (
        <ToggleButtonGroup value={mode} exclusive
                           onChange={() => setMode(mode === 'light' ? 'dark' : 'light')}>
            <ToggleButton value={"light"} style={{ height: 40 }}>
                <LightModeIcon/>
            </ToggleButton>
            <ToggleButton value={"dark"} style={{ height: 40 }}>
                <DarkModeIcon/>
            </ToggleButton>
        </ToggleButtonGroup>
    );
}

const modeTheme = extendTheme({
});

const confettiStyle: CSSProperties = {
    position: "fixed",
    pointerEvents: "none",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    zIndex: 999
}

const TimeLogs = (props: any) => {
    const { resumeTimeLog, deleteTimeLog } = props;

    const { data: timesheetData, isLoading, isSuccess } = useGetTimeLogsQuery()
    let totalDraftHours = 0
    const totalPerProject: any = {}

    if (isLoading) {
        return <div>Loading</div>
    }

    if (!timesheetData) {
        return <div>No data</div>
    }

    if (isSuccess) {
        Object.keys(timesheetData.logs).map((key: any) => {
            // @ts-ignore
            for (let timeLogData of timesheetData.logs[key]) {
                totalDraftHours += timeLogData['hours']
                let projectName = timeLogData['project_name']
                if (!totalPerProject.hasOwnProperty(projectName)) {
                    totalPerProject[projectName] = timeLogData['hours']
                } else {
                    totalPerProject[projectName] += timeLogData['hours']
                }
            }
        })
        if (totalDraftHours) {
            totalDraftHours = parseFloat(totalDraftHours.toFixed(2));
        }
    }

    return (
        <div>
            <Grid container>
                <Grid item xs={12} md={2}></Grid>
                <Grid item xs={12} md={8} style={{ paddingLeft: 5, paddingRight: 5 }}>
                    <Suspense>
                        <ScheduleInfo/>
                    </Suspense>
                </Grid>
                <Grid item xs={12} md={2}></Grid>
            </Grid>
            <Grid container>
                <Grid item xs={12} md={2}></Grid>
                <Grid item xs={12} md={8} style={{ paddingLeft: 5, paddingRight: 5 }}>
                    {
                        Object.keys(timesheetData.logs).map((key: any) =>
                            <div key={key} style={{ marginBottom: 10 }}>
                                <Suspense>
                                    <TimeLogTable
                                        key={key}
                                        data={timesheetData.logs[key]}
                                        date={key}
                                        resumeTimeLog={resumeTimeLog}
                                        deleteTimeLog={deleteTimeLog}
                                    />
                                </Suspense>
                            </div>
                        )
                    }
                </Grid>
                <Grid item xs={12} md={2}></Grid>
            </Grid>
            <Grid container>
                <Grid item xs={12} md={2}></Grid>
                <Grid item xs={12} md={8}>
                <div className={'timelogs-info'}>
                    <Grid container>
                        <Grid item xs={10} style={{ textAlign: "left"}}>
                        {
                            Object.keys(totalPerProject).map((key: any) =>
                                <Chip
                                    key={key}
                                    label={`${key} : ${totalPerProject[key].toFixed(2)}`}
                                    style={{ backgroundColor: generateColor(key), color: '#ffffff' }} />
                            )
                        }
                        </Grid>
                        <Grid item xs={2} style={{ textAlign: 'right' }}>
                        { totalDraftHours > 0 ?
                        <Chip label={`Total : ${totalDraftHours}`}
                            style={{
                                color: 'white',
                                backgroundColor: getTaskColor(totalDraftHours < 40 ? 1 - ((totalDraftHours % 40) / 40) : 0),
                                fontSize: '11pt', fontWeight: 'bold'}}
                        ></Chip> : null }
                        </Grid>
                    </Grid>
                </div>
                </Grid>
                <Grid item xs={12} md={2}></Grid>
            </Grid>
        </div>
    )
}

function App() {
    const { data: timesheetData, isLoading: isFetchingTimelogs, isSuccess: isSuccessFetching } = useGetTimeLogsQuery()
    const [activities, setActivities] = useState<any>([])
    const [selectedActivity, setSelectedActivity] = useState<any>(null)
    const [projectInput, setProjectInput] = useState('')
    const [projects, setProjects] = useState<any>([])
    const [projectLoading, setProjectLoading] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null)
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [tasks, setTasks] = useState<any>([])
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [quote, setQuote] = useState<any>({})
    const [runningTimeLog, setRunningTimeLog] = useState<TimeLog | null>(null)
    const [editingTimeLog, setEditingTimeLog] = useState<TimeLog | null>(null)
    const [editMode, setEditMode] = useState<boolean>(true)
    const [timerStarted, setTimerStarted] = useState(false);
    const [parent, setParent] = useState("")
    const refAnimationInstance = useRef(null);
    const [fadeProp, setFadeProp] = useState({
        fade: 'fade-out'
    })
    const [compliment, setCompliment] = useState(randomCompliments[0])
    const [submitTimesheet, { isLoading: isUpdating, isSuccess, isError }] = useSubmitTimesheetMutation();
    const [deleteTimeLog, { isLoading: isDeleteLoading, isSuccess: isDeleteSuccess, isError: isDeleteError }] = useDeleteTimeLogMutation();
    const [timeLogChildList, setTimeLogChildList] = useState<any>([])
    const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
    const [projectLinkList, setProjectLinkList] = useState<any>([])

    const timeCardRef = useRef(null);

    const refreshAtMidnight = () => {
        const now = new Date();
        const night = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
          0, 0, 0
        );
        const msToMidnight = night.getTime() - now.getTime();

        setTimeout(() => {
            window.location.reload();
        }, msToMidnight);
    };

    useEffect(() => {
        refreshAtMidnight();
    }, []);

     const getInstance = useCallback((instance) => {
        refAnimationInstance.current = instance;
      }, []);

    useEffect(() => {
        if (timesheetData && timesheetData.running) {
            if (timesheetData.running.project_name !== 'Kartoza') {
                setProjects([{
                    id: timesheetData.running.project_id,
                    label: timesheetData.running.project_name,
                    running: true
                }])
            }
            setTasks([{
                id: timesheetData.running.task_id,
                label: timesheetData.running.task_name,
                running: true,
            }])

            setRunningTimeLog(timesheetData.running)
            setTimerStarted(true)
        }
    }, [isSuccessFetching])

    const updateSelectedTimeLog = (data: TimeLog, checkParent = true) => {
        setDescription(data.description)
        setSelectedActivity({
            id: data.activity_id,
            label: data.activity_type
        })
        if (data.project_name !== 'Kartoza') {
            setSelectedProject({
                id: data.project_id,
                label: data.project_name,
                running: true
            })
        }

        setSelectedTask({
            id: data.task_id,
            label: data.task_name
        })
        if (checkParent && data.parent) {
           setParent(data.parent)
        }
        // @ts-ignore
        timeCardRef.current?.updateHours(data);
    }

    useEffect(() => {
        if (parent && !timerStarted) {
            setTimeout(() => {
                window.scrollTo(0, 0);
                // @ts-ignore
                timeCardRef.current?.startButtonClicked(true);
            }, 200)
        }
    }, [parent, timerStarted]);

    useEffect(() => {
        if (isDeleteLoading) {
            setLoading(true)
        }
        if (isDeleteSuccess || isDeleteError) {
            setLoading(false)
        }
    }, [isDeleteLoading, isDeleteSuccess, isDeleteError])

    useEffect(() => {
        if (editingTimeLog) {
            // Scroll to top
            window.scrollTo(0, 0);
            updateSelectedTimeLog(editingTimeLog, timeLogChildList.length === 0);
        }
    }, [editingTimeLog, timeLogChildList])

    useEffect(() => {
        if (runningTimeLog) {
            updateSelectedTimeLog(runningTimeLog);
        }
    }, [runningTimeLog])

    useEffect(() => {
        fetch('/activity-list/').then(
            response => response.json()
        ).then(
            json => {
                setActivities(json)
            }
        )
        fetch('/api/quotes/').then(response => response.json()).then(
            data => {
                if (data.length > 0) {
                    setQuote(data[0])
                }
            }
        );

        if (isTodayInDates(unavailableDates)) {
            setIsUnavailable(true);
        }
    }, [])

    useEffect(() => {
        if (isUpdating) {
            setLoading(true)
        }
        if (isSuccess || isError) {
            setLoading(false)
        }

    }, [isUpdating, isSuccess])

    useEffect(() => {
        setProjectLoading(true)
        let isRunningProject = projects.length === 1 ? projects[0].running : false
        if (projectInput.length > 1 && !isRunningProject) {
            fetch('/project-list/?q=' + projectInput).then(
                response => response.json()
            ).then(
                json => {
                    setProjects(json)
                    setProjectLoading(false)
                }
            )
        } else {
            setProjects([])
            setProjectLoading(false)
        }
    }, [projectInput])

    useEffect(() => {
        const celebrate = async () => {
            if (isSuccess) {
                setCompliment(
                    randomCompliments[Math.floor(Math.random() * randomCompliments.length)]
                )
                fireConfetti()
                setFadeProp({
                    fade: 'fade-in'
                })
                await timeout(300)
                fireConfetti()
                await timeout(2000)
                setFadeProp({
                    fade: 'fade-out'
                })
            }
        }
        celebrate();
    }, [isSuccess])

    useEffect(() => {
        if (selectedProject) {
            fetch('/task-list/' + selectedProject['id'] + '/').then(
                response => response.json()
            ).then(
                json => {
                    if (!selectedProject.running) {
                        setSelectedTask(null)
                    }
                    setTasks(json.map((jsonData: any) => {
                        const label = jsonData.label;
                        jsonData['color'] = getColorFromTaskLabel(label);
                        return jsonData
                    }))
                }
            )
            fetch('/project-links/?id=' + selectedProject['id']).then(
              response => response.json()
            ).then(
              json => {
                  setProjectLinkList(json)
              }
            )
        } else {
            setTasks([])
        }
    }, [selectedProject])

    // Clear activity, task, project, and description
    const clearAllFields = (clearActivity = true) => {
        if (clearActivity) {
            setSelectedProject(null)
            setSelectedActivity(null)
            setSelectedTask(null)
        }
        setDescription('')
        setEditingTimeLog(null)
        setEditMode(false)
        setRunningTimeLog(null)
    }
    const makeShot = useCallback((particleRatio, opts) => {
        // @ts-ignore
        refAnimationInstance.current && refAnimationInstance.current({
            ...opts,
            origin: {y: 0.7},
            particleCount: Math.floor(200 * particleRatio)
        });
    }, []);

    const fireConfetti = () => {
        makeShot(0.25, {
            spread: 26, startVelocity: 55
        });

        makeShot(0.2, {
            spread: 60
        });

        makeShot(0.35, {
            spread: 100, decay: 0.91, scalar: 0.8
        });

        makeShot(0.1, {
            spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2
        });

        makeShot(0.1, {
            spread: 120, startVelocity: 45
        });
    }

    const timeout = (delay: number) => {
        return new Promise( res => setTimeout(res, delay) );
    }

    const submitTimesheetClicked = async () => {
        submitTimesheet({})
    }

    const isEmpty = () => {
        if (typeof timesheetData === "undefined") return true
        if (Object.keys(timesheetData.logs).length === 0) {
            if (typeof quote === 'undefined' || Object.keys(quote).length === 0) {
                return true
            }
        }
        return false
    }

    const getTimeLogChild = (data: TimeLog) => {
        if (timesheetData && timesheetData['logs']) {
            let combinedTimelogs: TimeLog[] = [data];
            for (const timeLogByDate in timesheetData['logs']) {
                // Get the array of time logs for that date
                // @ts-ignore
                const timeLogsForDate: TimeLog[] = timesheetData['logs'][timeLogByDate];
                if (timeLogsForDate && timeLogsForDate.length > 0) {
                    for (const timeLog of timeLogsForDate) {
                        if (timeLog.parent === data.id) {
                            combinedTimelogs.push(timeLog)
                        }
                    }
                }
            }
            const sortedCombinedTimeLogs = combinedTimelogs.sort(
                (a, b) => parseInt(a.id) - parseInt(b.id))
            return sortedCombinedTimeLogs
        }
        return []
    }

    editTimeLogSignal.value = (timeLog: TimeLog) => {
        if (!timerStarted) {
            setEditMode(true)
            if (timeLog.total_children === 0) {
                setEditingTimeLog(timeLog);
            } else {
                setTimeLogChildList(getTimeLogChild(timeLog))
            }
        } else {
            alert('Please stop the running timer first.');
        }
    }

    cloneTimeLogSignal.value = (data: TimeLog) => {
        if (timerStarted) {
            alert('Please stop the running timer first.');
            return;
        }
        if (editingTimeLog) {
            setEditingTimeLog(null);
            setEditMode(false)
        }

        updateSelectedTimeLog(data);

        // @ts-ignore
        timeCardRef.current?.resetStartTime();
    }

    const onDeleteTimelog = (data: TimeLog, checkParent = true) => {
        if (checkParent && data.total_children > 0) {
            setEditMode(false)
            setTimeLogChildList(getTimeLogChild(data))
            return
        }
        if (window.confirm('Are you sure you want to delete this record?')) {
            deleteTimeLog({
                'id': data.id
            })
        }
    }

    deleteTimeLogSignal.value = (data: TimeLog, checkParent = true) => {
        onDeleteTimelog(data, checkParent);
    }

    resumeTimeLogSignal.value = (data: TimeLog) => {
        if (timerStarted) {
            alert('Please stop the running timer first.');
            return;
        }
        if (editingTimeLog) {
            setEditingTimeLog(null);
            setEditMode(false)
        }
        const newData = { ...data, parent: data.id };
        updateSelectedTimeLog(newData);
    }

    const toggleTimer = (timerStartedValue: boolean) => {
        if (!timerStartedValue) {
            setParent('')
        }
        setTimerStarted(timerStartedValue);
    }

    return (
        <CssVarsProvider theme={modeTheme}>
        <div className="App">
            <CircularMenu/>
            <ReportButton/>
            <Suspense>
                <ReactCanvasConfetti
                    style={confettiStyle}
                    refConfetti={getInstance}
                />
            </Suspense>
            <div className={"big-text"}>
                <h3 className={"animate-character " + fadeProp.fade}>
                    {compliment}
                </h3>
            </div>
            <Backdrop
                sx={{ color: '#fff', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
                open={loading}
            >
                <CircularProgress color="inherit" />
                <div>Sending data to ERPNext...</div>
            </Backdrop>
            <div className="App-header">
                <Grid container className="app-title-container">
                    <Grid item md={2} xs={12}></Grid>
                    <Grid item md={5} xs={12}>
                    <div className="app-title">
                        Timesheet
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <SettingsIcon
                                fontSize={'small'}
                                style={{ paddingLeft: '5px', cursor: 'pointer' }}
                                onClick={() => window.location.href = '/manage/'}
                            />
                        </div>
                    </div>

                    { isUnavailable ? <div className={'unavailable-message'}>
                        ⚠️ Today, timesheet submission to ERPNext will be unavailable.
                        Additionally, the app will be unavailable on the following dates: { unavailableDates }.
                    </div> : null}
                    </Grid>
                    <Grid item xs={12} md={4} style={{ display: 'flex', justifyContent: 'end', alignContent: 'center'}}>
                        <Suspense fallback={<div></div>}>
                            <Standup  data={timesheetData}/>
                        </Suspense>
                        <ModeToggle />
                    </Grid>
                    <Grid item xs={12} md={1}></Grid>
                </Grid>
                <Grid container style={{ marginTop: "50px" }}>
                    <Grid item md={2} xs={12} sx={{ display: { xs: 'none', md: 'block' } }} >
                        <LeaderBoard/>
                    </Grid>
                    <Grid item md={8} xs={12}>
                        <Grid container spacing={1} className="timesheet-container">
                        <Grid className="container-options" container item xs={12} md={8.5} spacing={1} style={{ marginRight: 20 }}>
                            <Grid item xs={12} md={6}>
                                <Autocomplete
                                    disablePortal
                                    id="activity-options"
                                    options={activities}
                                    disabled={parent !== ''}
                                    loading={activities.length > 0}
                                    getOptionLabel={ (options: any) => (options['label'])}
                                    isOptionEqualToValue={(option: any, value: any) => option['id'] == value['id']}
                                    onChange={(event: any, value: any) => {
                                        if (value) {
                                            setSelectedActivity(value)
                                        } else {
                                            setSelectedActivity(null)
                                        }
                                    }}
                                    value={selectedActivity}
                                    renderInput={(params) => (
                                        <TextField {...params}
                                           label="Activity"
                                           variant="filled"
                                           className="headerInput"
                                           InputProps={{
                                               ...params.InputProps,
                                               disableUnderline: true,
                                               endAdornment: (
                                                   <React.Fragment>
                                                       { setActivities.length == 0 ?
                                                           <CircularProgress color="inherit" size={20} /> : null }
                                                       { params.InputProps.endAdornment }
                                                   </React.Fragment>
                                               )
                                           }}
                                        />
                                    )
                                    }
                                />
                            </Grid>
                            <Grid item md={6} xs={12}>
                                <Box className={'project-link-container'}>
                                    {
                                        projectLinkList.map((projectLink) => (
                                            <Tooltip title={projectLink.name} placement={'top'}>
                                                <TButton variant={'outlined'} onClick={() => window.open(projectLink.link, '_blank')}>
                                                    <LinkOutlinedIcon/>
                                                </TButton>
                                            </Tooltip>
                                        ))
                                    }
                                </Box>
                                <Autocomplete
                                    disablePortal
                                    id="combo-box-demo"
                                    // @ts-ignore
                                    options={projects}
                                    getOptionLabel={ (options: any) => (options['label'])}
                                    isOptionEqualToValue={(option: any, value: any) => option['id'] == value['id']}
                                    onChange={(event: any, value: any) => {
                                        if (value) {
                                            setSelectedProject(value)
                                        } else {
                                            setSelectedProject(null)
                                            setProjectLinkList([])
                                            setSelectedTask(null)
                                        }
                                    }}
                                    disabled={parent !== ''}
                                    value={selectedProject}
                                    onInputChange={(event, newInputValue) => {
                                        setProjectInput(newInputValue)
                                    }}
                                    loading={projectLoading}
                                    renderInput={(params) => (
                                        <TextField {...params}
                                                   label="Project"
                                                   variant="filled"
                                                   className="headerInput"
                                                   InputProps={{
                                                       ...params.InputProps,
                                                       disableUnderline: true,
                                                       endAdornment: (
                                                           <React.Fragment>
                                                               { projectLoading ?
                                                                   <CircularProgress color="inherit" size={20} /> : null }
                                                               { params.InputProps.endAdornment }
                                                           </React.Fragment>
                                                       )
                                                   }}
                                        />
                                    )
                                    }
                                />
                            </Grid>
                            <Grid item xs={12} >
                                <Autocomplete
                                    disablePortal
                                    id="combo-box-demo"
                                    // @ts-ignore
                                    options={tasks}
                                    disabled={parent !== ''}
                                    getOptionLabel={ (options: any) => (options['label'])}
                                    isOptionEqualToValue={(option: any, value: any) => option['id'] == value['id']}
                                    onChange={(event: any, value: any) => {
                                        if (value) {
                                            setSelectedTask(value)
                                        } else {
                                            setSelectedTask(null)
                                        }
                                    }}
                                    renderOption={(props, option) => {
                                        const backgroundColor = option.color ? option.color : 'rgba(255,255,255,1)';
                                        const textColor = isColorLight(backgroundColor) ? '#000000' : '#FFFFFF';
                                        return (
                                            <li {...props}
                                                style={{
                                                    backgroundColor: backgroundColor,
                                                    color: textColor
                                            }}>
                                            {option.label}</li>
                                        )
                                    }}
                                    value={selectedTask}
                                    renderInput={(params) => {
                                        let backgroundColor = 'inherit'
                                        let textColor = 'inherit';
                                        if (params.inputProps.value) {
                                            backgroundColor = getColorFromTaskLabel(params.inputProps.value);
                                            textColor = isColorLight(backgroundColor) ? '#000000' : '#FFFFFF'
                                        }
                                        return <TextField
                                            {...params}
                                            label="Task"
                                            variant="filled"
                                            className="headerInput"
                                            // @ts-ignore
                                            style={{
                                                backgroundColor: backgroundColor
                                            }}
                                            InputProps={{
                                                ...params.InputProps,
                                                disableUnderline: true,
                                                style: {
                                                    color: textColor
                                                }
                                            }}
                                            InputLabelProps={{
                                                style: params.inputProps.value ? { color: textColor } : {}
                                            }}
                                        />
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} style={{ marginRight: 5, minHeight: 110 }}>
                                <Suspense fallback={<Loader/>}>
                                    <TReactQuill
                                        formats={['bold', 'link', 'strike',
                                        'italic', 'list', 'indent', 'align', 'code-block']}
                                        modules={{
                                            toolbar: [
                                            ['bold', 'italic','strike', 'blockquote'],
                                            [{'list': 'ordered'}, {'list': 'bullet'}],
                                            ['link'],
                                            ],
                                        }}
                                        value={description}
                                        onChange={(value : any) => {
                                            if (value === '<p><br></p>') {
                                                setDescription('')
                                            } else {
                                                setDescription(value)
                                            }
                                        }}
                                        style={{minHeight: '150px'}}
                                    />
                                </Suspense>
                            </Grid>
                        </Grid>

                        <Grid container item xs={12} md={3}>
                            <Box className="time-box">
                                <Suspense>
                                    <TimeCard
                                        ref={timeCardRef}
                                        runningTimeLog={runningTimeLog}
                                        editingTimeLog={editingTimeLog}
                                        task={selectedTask}
                                        project={selectedProject}
                                        activity={selectedActivity}
                                        description={description}
                                        parent={parent}
                                        toggleTimer={toggleTimer}
                                        isUnavailable={isUnavailable}
                                        clearAllFields={clearAllFields}/>
                                </Suspense>
                            </Box>
                        </Grid>
                    </Grid>
                    </Grid>
                    <Grid item md={2} xs={12} sx={{ display: { xs: 'none', md: 'block' } }} >
                        <UserActivities/>
                    </Grid>
                </Grid>
            </div>
            <TimeLogChildList
                timeLogChildren={timeLogChildList}
                editMode={editMode}
                timeLogSelected={(timelog: TimeLog) => {
                    if (editMode) {
                        setEditingTimeLog(timelog)
                    } else {
                        onDeleteTimelog(timelog, false)
                    }
                }}
                onClose={() => setTimeLogChildList([])}/>
            <TimeLogs/>
            { isEmpty() ? <div><CircularProgress style={{ marginTop: '50px' }} /></div> : null }
            { timesheetData && Object.keys(timesheetData.logs).length > 0 ?
            <Grid container>
                <Grid item xs={12} md={4}></Grid>
                <Grid item xs={12} md={4}>
                <TButton variant="contained" disabled={isUnavailable} endIcon={<SendIcon />} className="send-erpnext-btn" onClick={submitTimesheetClicked} style={{ marginBottom: 50 }}>
                    Send To Erpnext
                </TButton>
                </Grid>
                <Grid item xs={12} md={4}></Grid>
            </Grid> : <div style={{ height: 50 }}>&nbsp;</div>
            }
            { quote ?
            <div className='quote-container'>
                <Typography className='quote'>{quote['q']}</Typography>
                {quote['a'] ?
                    <Typography className='quote-author'> — {quote['a']}</Typography>
                    : ''
                }
            </div> : ''}
        </div>
        </CssVarsProvider>
    );
}

export default App;
