import React, {useEffect, useState} from 'react';
import './styles/App.scss';
import {
    Container,
    Autocomplete,
    TextField, CircularProgress, Button, Grid, CardContent, CardActions, Box, createStyles, Theme, Backdrop, Typography
} from "@mui/material";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import TimeLogTable from "./components/TimeLogTable";
import { theme, generateColor } from "./utils/Theme";
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import ListIcon from '@mui/icons-material/List';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import {ThemeProvider} from "@mui/material/styles";
import Chip from '@mui/material/Chip';
import moment from "moment";
import {
    TimeLog,
    useAddTimesheetMutation,
    useGetTimeLogsQuery,
    useSubmitTimesheetMutation,
    useUpdateTimesheetMutation
} from "./services/api";

function addHours(numOfHours: any, date = new Date()) {
    let numOfSeconds = numOfHours / 3600
    date.setTime(date.getTime() + numOfSeconds * 60 * 60 * 60 * 60 * 1000);
    return date;
}

function formatTime(date = new Date()) {
    let tzOffset = (new Date()).getTimezoneOffset() * 60000;
    let localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, -1);
    return localISOTime.replace('T', ' ').split('.')[0]
}

interface TimeCardProps {
    updateTimeLog?: any | null,
    runningTimeLog?: any | null,
    task?: any | null,
    activity?: any | null,
    description?: String | '',
    clearAllFields?: any
}

let interval: any = null;

function TimeCard({ runningTimeLog, task, activity, description, clearAllFields } : TimeCardProps) {
    const [startTime, setStartTime] = React.useState<Date | null>(new Date());
    const [hours, setHours] = React.useState<Number | null>(null);
    const [addButtonDisabled, setAddButtonDisabled] = React.useState(true);
    const [startButtonDisabled, setStartButtonDisabled] = React.useState(true);
    const [isLogging, setIsLogging] = useState(false);
    const [runningTime, setRunningTime] = useState('00:00:00');
    const [localRunningTimeLog, setLocalRunningTimeLog] = useState<any | null>(null);

    const [addTimesheet, { isLoading: isUpdating, isSuccess, isError, data }] = useAddTimesheetMutation();
    const [updateTimesheet, {  isLoading: isUpdateLoading, isSuccess: isUpdateSuccess, isError: isUpdateError, data: updatedData }] = useUpdateTimesheetMutation();


    useEffect(() => {
        setAddButtonDisabled(startTime == null || hours == null || !activity)
        setStartButtonDisabled(!activity)
    }, [startTime, hours, task, activity])

    useEffect(() => {
        if (isSuccess) {
            if (data.running) {
                setLocalRunningTimeLog(data);
            } else {
                setLocalRunningTimeLog(null)
                setHours(null)
                clearAllFields()
            }
        }
    }, [isSuccess])

    useEffect(() => {
        if (localRunningTimeLog) {
            if (updatedData && !updatedData.running) {
                clearInterval(interval);
                setRunningTime('00:00:00');
                setLocalRunningTimeLog(null);
                clearAllFields();
            }
        }
    }, [isUpdateSuccess])

    useEffect(() => {
        if (runningTimeLog) {
            setLocalRunningTimeLog(runningTimeLog);
        }
    }, [runningTimeLog])

    useEffect(() => {
        if (localRunningTimeLog) {
            setStartButtonDisabled(false)
            updateTimeRecursively();
        } else {
            if (interval)
                clearInterval(interval);
        }
    }, [localRunningTimeLog])

    const stopButtonClicked = async () => {
        if (!localRunningTimeLog) return;
        clearInterval(interval);
        setStartButtonDisabled(true);
        const runningTimeClone = Object.assign({}, localRunningTimeLog);
        let task_id = ''
        if (task) {
            task_id = task.id
        }
        if (!task_id) {
            task_id = '-'
        }
        runningTimeClone['task'] = {
            'id': task_id
        }
        runningTimeClone['activity'] = {
            'id': activity.id
        }
        runningTimeClone['description'] = description;
        runningTimeClone['end_time'] = formatTime(new Date());
        updateTimesheet(runningTimeClone);
    }

    const startButtonClicked = async () => {
        setStartButtonDisabled(true);
        clearInterval(interval);
        if (!startTime || !activity) {
            return
        }
        let task_id = '-'
        if (task) {
            task_id = task.id
        }
        addTimesheet({
            start_time: formatTime(new Date()),
            task: {
                'id': task_id
            },
            activity: {
                'id': activity.id
            },
            description: description
        })
    }

    const addButtonClicked = async () => {
        // Calculate start-time and end-time
        let endTime = null
        if (hours && startTime) {
            let startTimeCopy = new Date(startTime.toISOString())
            endTime = addHours(hours, startTimeCopy)
        }
        if (!endTime || !startTime || !activity) {
            return
        }
        let task_id = '-'
        if (task) {
            task_id = task.id
        }
        setStartTime(endTime)
        let startTimeStr = formatTime(startTime)
        let endTimeStr = formatTime(endTime)
        addTimesheet({
            start_time: startTimeStr,
            end_time: endTimeStr,
            task: {
                'id': task_id
            },
            activity: {
                'id': activity.id
            },
            description: description
        })
    }

    const updateTime = () => {
        let fromTimeObj = moment(
          localRunningTimeLog.from_time,
          'YYYY-MM-DD hh:mm:ss');
        let diff = moment().diff(fromTimeObj);
        let d = moment.duration(diff);
        setRunningTime(moment.utc(diff).format("HH:mm:ss"))
    }

    const updateTimeRecursively = () => {
        updateTime();
        interval = setInterval(updateTime, 1000);
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            { isLogging ?
            <div>
                <CardContent sx={{ paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
                    <DateTimePicker
                        value={startTime}
                        onChange={(newValue) => setStartTime(newValue)}
                        renderInput={(params) => <TextField {...params} variant="standard" sx={{ width: 200 }} />}
                    />
                    <TextField
                        value={hours !== null ? hours : ''}
                        onChange={(event) => (
                            setHours(event.target.value !== '' ? parseFloat(event.target.value) : null)
                        )}
                        id="hour"
                        type="number"
                        InputProps={{
                            inputProps: { min: 0 }
                        }}
                        label="Hours" variant="standard" sx={{ width: 200 }} />
                </CardContent>
                <CardActions sx={{ justifyContent: "center", padding: 0, marginBottom: '10px', marginTop: '4px' }}>
                    <ThemeProvider theme={theme}>
                        <Button color="main" variant="contained" size="small" sx={{ width: '100%', marginTop: -1 }}
                                onClick={addButtonClicked}
                                disabled={addButtonDisabled || isUpdating}
                                disableElevation>{isUpdating ? <CircularProgress color="inherit" size={20} /> : "Add" }</Button>
                    </ThemeProvider>
                </CardActions>
            </div> :
            <div style={{marginTop: '8px'}}>
                <Typography variant={'h3'} style={{color:'#1d575c'}}>{runningTime}</Typography>
                <CardContent sx={{ paddingLeft: 0, paddingRight: 0 }}>
                    <ThemeProvider theme={theme}>
                        {localRunningTimeLog ?
                          <Button color="main" variant="contained" size="small"
                                  sx={{width: 200, height: '58px', marginTop: -1}}
                                  onClick={stopButtonClicked}
                                  disabled={startButtonDisabled}
                                  disableElevation>{isUpdateLoading ?
                            <CircularProgress color="inherit" size={20}/> : "STOP"}</Button> :
                          <Button color="success" variant="contained" size="small"
                                  sx={{width: 200, height: '58px', marginTop: -1}}
                                  onClick={startButtonClicked}
                                  disabled={startButtonDisabled}
                                  disableElevation>{isUpdating ?
                            <CircularProgress color="inherit" size={20}/> : "START"}</Button>
                        }
                    </ThemeProvider>
                </CardContent>
            </div> }
            <div style={{ marginTop: '3px' }}>
                <Grid container spacing={0.6}>
                    <Grid item xs={6}>
                        <Button variant={'outlined'} disabled={!isLogging} color={'success'} style={{ width: '100%' }} onClick={() => setIsLogging(false)}>
                            <PlayCircleIcon/>
                        </Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button variant={'outlined'} disabled={isLogging} color={'success'} style={{ width: '100%' }} onClick={() => setIsLogging(true)}>
                            <ListIcon/>
                        </Button>
                    </Grid>
                </Grid>
            </div>
        </LocalizationProvider>
    )
}


const TimeLogs = () => {
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
                {
                    Object.keys(totalPerProject).map((key: any) =>
                        <Chip
                            key={key}
                            label={`${key} : ${totalPerProject[key]}`}
                            style={{ backgroundColor: generateColor(key) }} />
                    )
                }
                { totalDraftHours > 0 ?
                <Chip label={`Total Draft : ${totalDraftHours}`}
                    style={{ backgroundColor: '#dcdcdc'}}
                ></Chip> : null }
            </div>
            </Container>
            {
                Object.keys(timesheetData.logs).map((key: any) =>
                    <div key={key} style={{ marginBottom: 10 }}>
                        <TimeLogTable key={key} data={timesheetData.logs[key]} date={key}/>
                    </div>
                )
            }
        </div>
    )
}

const TimesheetBar = () => {
   return (
     <div></div>
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
    const [submitTimesheet, { isLoading: isUpdating, isSuccess, isError }] = useSubmitTimesheetMutation();

    useEffect(() => {
        if (timesheetData && timesheetData.running) {
            setSelectedActivity(timesheetData.running.activity_type)
            setDescription(timesheetData.running.description)
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
                running: true
            }])

            setRunningTimeLog(timesheetData.running)
        }
    }, [isSuccessFetching])

    useEffect(() => {
        if (runningTimeLog) {
            setSelectedActivity({
                id: runningTimeLog.activity_id,
                label: runningTimeLog.activity_type
            })
            setSelectedTask({
                id: runningTimeLog.task_id,
                label: runningTimeLog.task_name
            })
            if (runningTimeLog.project_name !== 'Kartoza') {
                setSelectedProject({
                    id: runningTimeLog.project_id,
                    label: runningTimeLog.project_name,
                    running: true
                })
            }
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
        if (projectInput.length > 2 && !isRunningProject) {
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
        if (selectedProject && !selectedProject.running) {
            fetch('/task-list/' + selectedProject['id'] + '/').then(
                response => response.json()
            ).then(
                json => {
                    setSelectedTask(null)
                    setTasks(json)
                }
            )
        } else {
            setTasks([])
        }
    }, [selectedProject])

    // Clear activity, task, project, and description
    const clearAllFields = () => {
        setSelectedProject(null)
        setSelectedActivity(null)
        setSelectedTask(null)
        setDescription('')
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

    return (
        <div className="App">
            <Backdrop
                sx={{ color: '#fff', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
                open={loading}
            >
                <CircularProgress color="inherit" />
                <div>Sending data to ERPNext...</div>
            </Backdrop>
            <div className="App-header">
                <Container maxWidth="lg" style={{ display: 'flex' }}>
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
                </Container>
                <Container maxWidth="lg" style={{ marginTop: "50px" }}>
                    <Grid container spacing={1}>
                        <Grid container item xs={9.5} spacing={1} style={{ marginRight: 20, maxHeight: '185px' }}>
                            <Grid item xs={4}>
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
                            <Grid item xs={4}>
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
                            <Grid item xs={4}>
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
                                    value={selectedTask}
                                    renderInput={(params) => <TextField
                                        {...params}
                                        label="Task"
                                        variant="filled"
                                        className="headerInput"
                                        InputProps={{
                                            ...params.InputProps,
                                            disableUnderline: true,
                                        }}
                                    />}
                                />
                            </Grid>
                            <Grid item xs={12} style={{paddingRight: '4px'}}>
                                <TextField style={{ width: "100%", minHeight: '20px' }}
                                           label="Description"
                                           multiline
                                           rows={2}
                                           variant="filled" className="headerInput" value={description} onChange={e => setDescription(e.target.value)}
                                           InputProps={{
                                               disableUnderline: true,
                                           }}
                                />
                            </Grid>
                        </Grid>
                        <Grid container item xs={2.2}>
                            <Box className="time-box">
                                <TimeCard runningTimeLog={runningTimeLog} task={selectedTask} activity={selectedActivity} description={description} clearAllFields={clearAllFields}/>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </div>
            <TimeLogs/>
            { isEmpty() ? <div><CircularProgress style={{ marginTop: '50px' }} /></div> : null }
            { quote ?
                <div className='quote-container'>
                    <Typography className='quote'>{quote['content']}</Typography>
                    {quote['author'] ?
                        <Typography className='quote-author'> — {quote['author']}</Typography>
                        : ''
                    }
                </div> :
            <Button variant="contained" endIcon={<SendIcon />} className="send-erpnext-btn" onClick={submitTimesheetClicked} style={{ marginBottom: 50 }}>
                Send To Erpnext
            </Button>
            }
        </div>
    );
}

export default App;
