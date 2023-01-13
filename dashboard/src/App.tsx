import React, {useEffect, useState, Suspense} from 'react';
import './styles/App.scss';
import Container from '@mui/material/Container';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Backdrop from '@mui/material/Backdrop';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { generateColor, getColorFromTaskLabel, getTaskColor } from "./utils/Theme";
import {
    TimeLog,
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
    DarkModeIcon 
} from './loadable/Icon';
import Loader from './loadable/Loader';
const Standup = React.lazy(() => import('./components/Standup'));
const TimeCard = React.lazy(() => import('./components/TimeCard'));
const TReactQuill = React.lazy(() => import('./components/ReactQuill'));
const TimeLogTable = React.lazy(() => import("./components/TimeLogTable"));


function ModeToggle() {
    const { mode, setMode } = useColorScheme();
    return (
        <ToggleButtonGroup value={mode} exclusive
                           onChange={() => setMode(mode === 'light' ? 'dark' : 'light')}>
            <ToggleButton value={"light"}>
                <LightModeIcon/>
            </ToggleButton>
            <ToggleButton value={"dark"}>
                <DarkModeIcon/>
            </ToggleButton>
        </ToggleButtonGroup>
    );
}

const modeTheme = extendTheme({
});


const TimeLogs = (props: any) => {
    const { editTimeLog, copyTimeLog } = props;

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
            <Container maxWidth="lg">
            <div className={'timelogs-info'}>
                <Grid container>
                    <Grid item xs={10} style={{ textAlign: "left"}}>
                    {
                        Object.keys(totalPerProject).map((key: any) =>
                            <Chip
                                key={key}
                                label={`${key} : ${totalPerProject[key]}`}
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
            </Container>
            {
                Object.keys(timesheetData.logs).map((key: any) =>
                    <div key={key} style={{ marginBottom: 10 }}>
                        <Suspense>
                            <TimeLogTable
                                key={key}
                                data={timesheetData.logs[key]}
                                date={key}
                                editTimeLog={editTimeLog}
                                copyTimeLog={copyTimeLog}/>
                        </Suspense>
                    </div>
                )
            }
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
    const [timerStarted, setTimerStarted] = useState(false);
    const [submitTimesheet, { isLoading: isUpdating, isSuccess, isError }] = useSubmitTimesheetMutation();

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

    const updateSelectedTimeLog = (data: TimeLog) => {
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
    }

    useEffect(() => {
        if (editingTimeLog) {
            updateSelectedTimeLog(editingTimeLog);
        }
    }, [editingTimeLog])

    useEffect(() => {
        if (runningTimeLog) {
            updateSelectedTimeLog(runningTimeLog);
        }
    }, [runningTimeLog])

    useEffect(() => {
        if (typeof timesheetData !== 'undefined') {
            if (Object.keys(timesheetData.logs).length === 0) {
                fetch('https://api.quotable.io/random?tags=wisdom|future|humor').then(response => response.json()).then(
                    data => setQuote(data)
                );
            } else {
                setQuote(undefined)
            }
        }

    }, [timesheetData])

    useEffect(() => {
        fetch('/activity-list/').then(
            response => response.json()
        ).then(
            json => {
                setActivities(json)
            }
        )


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
        setRunningTimeLog(null)
    }

    const submitTimesheetClicked = () => {
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

    const editTimeLog = (data: TimeLog) => {
        if (!timerStarted) {
            setEditingTimeLog(data);
        } else {
            alert('Please stop the running timer first.');
        }
    }

    const copyTimeLog = (data: TimeLog) => {
        if (timerStarted) {
            alert('Please stop the running timer first.');
            return;
        }
        if (editingTimeLog) {
            setEditingTimeLog(null);
        }
        updateSelectedTimeLog(data);
    }

    const toggleTimer = (timerStartedValue: boolean) => {
        setTimerStarted(timerStartedValue);
    }

    return (
        <CssVarsProvider theme={modeTheme}>
        <div className="App">
            <Backdrop
                sx={{ color: '#fff', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
                open={loading}
            >
                <CircularProgress color="inherit" />
                <div>Sending data to ERPNext...</div>
            </Backdrop>
            <div className="App-header">
                <Container maxWidth="lg" className="app-title-container">
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

                    <div style={{ display: 'flex', marginLeft: 'auto'}}>
                        <Suspense fallback={<div></div>}>
                            <Standup  data={timesheetData}/>
                        </Suspense>
                        <ModeToggle />
                    </div>
                </Container>
                <Container maxWidth="lg" style={{ marginTop: "50px" }}>
                    <Grid container spacing={1} className="timesheet-container">
                        <Grid className="container-options" container item xs={12} md={9.5} spacing={1} style={{ marginRight: 20 }}>
                            <Grid item xs={12} md={4}>
                                <Autocomplete
                                    disablePortal
                                    id="activity-options"
                                    options={activities}
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
                            <Grid item md={4} xs={12}>
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
                                            setSelectedTask(null)
                                        }
                                    }}
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
                            <Grid item md={4} xs={12}>
                                <Autocomplete
                                    disablePortal
                                    id="combo-box-demo"
                                    // @ts-ignore
                                    options={tasks}
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
                                        return (<li {...props}
                                                    style={{ backgroundColor: option.color ? option.color : 'rgba(255,255,255,0)' }}>
                                            {option.label}</li>)
                                    }}
                                    value={selectedTask}
                                    renderInput={(params) => {
                                        return <TextField
                                            {...params}
                                            label="Task"
                                            variant="filled"
                                            className="headerInput"
                                            // @ts-ignore
                                            style={{ backgroundColor: params?.inputProps?.value !== '' ? getColorFromTaskLabel(params.inputProps.value) : 'rgba(255,255,255,0)' }}
                                            InputProps={{
                                                ...params.InputProps,
                                                disableUnderline: true,
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

                        <Grid container item xs={12} md={2.2}>
                            <Box className="time-box">
                                <Suspense>
                                    <TimeCard
                                        runningTimeLog={runningTimeLog}
                                        editingTimeLog={editingTimeLog}
                                        task={selectedTask}
                                        activity={selectedActivity}
                                        description={description}
                                        toggleTimer={toggleTimer}
                                        clearAllFields={clearAllFields}/>
                                </Suspense>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </div>
            <TimeLogs editTimeLog={editTimeLog} copyTimeLog={copyTimeLog}/>
            { isEmpty() ? <div><CircularProgress style={{ marginTop: '50px' }} /></div> : null }
            { quote ?
                <div className='quote-container'>
                    <Typography className='quote'>{quote['content']}</Typography>
                    {quote['author'] ?
                        <Typography className='quote-author'> — {quote['author']}</Typography>
                        : ''
                    }
                </div> :
            <Grid container>
                <Grid item xs={12} md={4}></Grid>
                <Grid item xs={12} md={4}>
                <TButton variant="contained" endIcon={<SendIcon />} className="send-erpnext-btn" onClick={submitTimesheetClicked} style={{ marginBottom: 50 }}>
                    Send To Erpnext
                </TButton>
                </Grid>
                <Grid item xs={12} md={4}></Grid>
            </Grid>
            }
        </div>
        </CssVarsProvider>
    );
}

export default App;
