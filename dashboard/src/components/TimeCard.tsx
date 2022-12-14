import { CardContent, TextField, CardActions, Button, CircularProgress, Typography, Grid } from "@mui/material";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import ListIcon from '@mui/icons-material/List';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import moment from "moment";
import React, { useCallback, useEffect, useState } from "react";
import { useAddTimesheetMutation, useUpdateTimesheetMutation } from "../services/api";
import { addHours, formatTime } from "../utils/time";


interface TimeCardProps {
    updateTimeLog?: any | null,
    runningTimeLog?: any | null,
    editingTimeLog?: any | null,
    toggleTimer?: any,
    task?: any | null,
    activity?: any | null,
    description?: String | '',
    clearAllFields?: any
}


let interval: any = null;

export default function TimeCard({ 
    runningTimeLog, 
    editingTimeLog, 
    toggleTimer, 
    task, 
    activity, 
    description, 
    clearAllFields } : TimeCardProps) {
    const [startTime, setStartTime] = React.useState<any | null>(new Date());
    const [hours, setHours] = React.useState<Number | null>(null);
    const [hourString, setHourString] = React.useState<string>('');
    const [addButtonDisabled, setAddButtonDisabled] = React.useState(true);
    const [startButtonDisabled, setStartButtonDisabled] = React.useState(true);
    const [isLogging, setIsLogging] = useState(false);
    const [runningTime, setRunningTime] = useState('00:00:00');
    const [localRunningTimeLog, setLocalRunningTimeLog] = useState<any | null>(null);
    const [updatedTimesheet, setUpdatedTimesheet] = useState<any>(null)
    const [newTimesheet, setNewTimesheet] = useState<any>(null)

    const [addTimesheet, { isLoading: isUpdating, isSuccess, isError, data: newData }] = useAddTimesheetMutation();
    const [updateTimesheet, {  isLoading: isUpdateLoading, isSuccess: isUpdateSuccess, isError: isUpdateError, data: updatedData }] = useUpdateTimesheetMutation();

    useEffect(() => {
        setUpdatedTimesheet(updatedData)
    }, [updatedData])

    useEffect(() => {
        setNewTimesheet(newData)
    }, [newData])


    useEffect(() => {
        setAddButtonDisabled(startTime == null || hours == null || !activity || description === '')
        setStartButtonDisabled(!activity)
    }, [startTime, hours, task, activity, description])


    const clearData = useCallback(() => {
        setHours(null);
        setHourString('')
        clearAllFields();
        setUpdatedTimesheet(null)
        setNewTimesheet(null)
    }, [clearAllFields])

    useEffect(() => {
        if (isSuccess && newTimesheet) {
            if (newTimesheet.running) {
                setLocalRunningTimeLog(newTimesheet);
            } else {
                setLocalRunningTimeLog(null)
                clearData();
            }
        }
    }, [isSuccess, newTimesheet, clearData])

    useEffect(() => {
        if (localRunningTimeLog || editingTimeLog) {
            if (updatedTimesheet && !updatedTimesheet.running) {
                clearInterval(interval);
                setStartButtonDisabled(true);
                setRunningTime('00:00:00');
                setLocalRunningTimeLog(null);
                clearData();
            }
        }
    }, [localRunningTimeLog, 
        editingTimeLog, 
        isUpdateSuccess,
        updatedTimesheet,
        clearData])

    useEffect(() => {
        if (editingTimeLog) {
            setHours(editingTimeLog.hours);
            setHourString(editingTimeLog.hours);
            setStartTime(moment(editingTimeLog.from_time, 'YYYY-MM-DD hh:mm:ss'));
        }
    }, [editingTimeLog])

    useEffect(() => {
        if (runningTimeLog) {
            setLocalRunningTimeLog(runningTimeLog);
        }
    }, [runningTimeLog])

    const updateTime = useCallback(() => {
        let fromTimeObj = moment(
          localRunningTimeLog.from_time,
          'YYYY-MM-DD hh:mm:ss');
        let diff = moment().diff(fromTimeObj);
        let d = moment.duration(diff);
        setRunningTime(moment.utc(diff).format("HH:mm:ss"))
    }, [localRunningTimeLog])

    const updateTimeRecursively = useCallback(() => {
        updateTime();
        interval = setInterval(updateTime, 1000);
    }, [updateTime])

    useEffect(() => {
        if (localRunningTimeLog) {
            setStartButtonDisabled(false)
            updateTimeRecursively();

            const link = document.querySelector("link[rel~='icon']") as HTMLAnchorElement | null;
            if (link) {
                link.href = '/static/running-favicon.ico';
            }
        } else {
            if (interval)
                clearInterval(interval);
        }
    }, [localRunningTimeLog, updateTimeRecursively])

    const stopButtonClicked = async () => {
        if (!localRunningTimeLog) return;
        toggleTimer(false);
        clearInterval(interval);
        setStartButtonDisabled(true);

        const link = document.querySelector("link[rel~='icon']") as HTMLAnchorElement | null;
        if (link) {
            link.href = '/static/default-favicon.ico';
        }

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
        toggleTimer(true);

        if (!startTime || !activity) {
            return
        }
        let task_id = ''
        if (task) {
            task_id = task.id
        }
        if (!task_id) {
            task_id = '-'
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
        let _startTime = startTime;
        if (typeof startTime.toDate === 'function') {
            _startTime = startTime.toDate();
        }
        let startTimeStr = formatTime(_startTime)
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


    const submitEditedTimeLog = () => {
        let endTime = null
        if (hours && startTime) {
            let startTimeCopy = new Date(startTime.toISOString())
            endTime = addHours(hours, startTimeCopy)
        }
        if (!editingTimeLog || !startTime || !endTime || !activity) {
            return
        }
        if (editingTimeLog) {
            const editingTimeClone = Object.assign({}, editingTimeLog);
            let task_id = ''
            if (task) {
                task_id = task.id
            }
            if (!task_id) {
                task_id = '-'
            }
            editingTimeClone['task'] = {
                'id': task_id
            }
            editingTimeClone['activity'] = {
                'id': activity.id
            }
            editingTimeClone['description'] = description;
            editingTimeClone['end_time'] = formatTime(endTime);
            let _startTime = startTime;
            if (typeof startTime.toDate === 'function') {
                _startTime = startTime.toDate();
            }
            editingTimeClone['start_time'] = formatTime(_startTime);
            editingTimeClone['editing'] = true;
            updateTimesheet(editingTimeClone);
        }
    }

    const cancelEditingTimeLog = () => {
        clearData();
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            { isLogging || editingTimeLog ?
            <div>
                <CardContent sx={{ paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
                    <DateTimePicker
                        value={startTime}
                        onChange={(newValue) => setStartTime(newValue)}
                        renderInput={(params) => <TextField {...params} variant="standard" sx={{ width: "100%" }} />}
                    />
                    <TextField
                        error={hourString.length > 4 && !hours}
                        value={hourString}
                        onChange={(event) => {
                            const value = event.target.value;
                            setHours(null)
                            setHourString(value)
                            if (!value) {
                                return
                            }

                            // @ts-ignore
                            if (!isNaN(value)) {
                                setHours(parseFloat(value))
                                return
                            }
                            const timeData = value.match(/(0?[1-9]|1[0-2])(:|.)[0-9]{2}/g)
                            if (timeData && timeData.length > 0) {
                                const timeDataString = timeData[0]
                                if (timeDataString.includes(':')) {
                                    const minutes = timeDataString.split(':')[1]
                                    const hour = timeDataString.split(':')[0]
                                    setHours(parseFloat((parseFloat(hour) + (parseFloat(minutes)/60)).toFixed(2)))
                                } else {
                                    setHours(parseFloat(timeDataString))
                                }
                            }
                        }}
                        id="hour"
                        type="text"
                        helperText='HH:MM or decimal'
                        InputProps={{
                            inputProps: { min: 0 }
                        }}
                        label="Hours" variant="standard" sx={{ width: "100%" }} />
                </CardContent>
                <CardActions sx={{ justifyContent: "center", padding: 0, marginBottom: '10px', marginTop: '4px' }}>
                    {editingTimeLog ?
                        <div style={{width: '100%'}}>
                            <Button color="warning" variant="contained" size="small" sx={{width: '50%', marginTop: -1}}
                                    onClick={cancelEditingTimeLog}
                                    disabled={isUpdateLoading}
                                    disableElevation>Cancel</Button>
                            <Button color="success" variant="contained" size="small" sx={{width: '50%', marginTop: -1}}
                                onClick={submitEditedTimeLog}
                                disabled={isUpdateLoading}
                                disableElevation>{isUpdateLoading ?
                            <CircularProgress color="inherit" size={20}/> : "Save"}</Button>
                        </div>:
                        <Button variant="contained" size="small" sx={{width: '100%', marginTop: -1}}
                                onClick={addButtonClicked}
                                disabled={addButtonDisabled || isUpdating}
                                disableElevation>{isUpdating ?
                            <CircularProgress color="inherit" size={20}/> : "Add"}</Button>
                    }
                </CardActions>
            </div> :
            <div style={{marginTop: '8px'}}>
                <Typography variant={'h3'} style={{color:'#1d575c'}}>{runningTime}</Typography>
                <CardContent sx={{ paddingLeft: 0, paddingRight: 0 }}>
                        {localRunningTimeLog ?
                          <Button color="info" variant="contained" size="small"
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
                </CardContent>
            </div> }
            <div style={{ marginTop: '3px' }}>
                <Grid container spacing={0.6}>
                    <Grid item xs={6}>
                        <Button variant={'outlined'} disabled={!isLogging || editingTimeLog} color={'success'} style={{ width: '100%' }} onClick={() => setIsLogging(false)}>
                            <PlayCircleIcon/>
                        </Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button variant={'outlined'} disabled={isLogging || editingTimeLog || localRunningTimeLog} color={'success'} style={{ width: '100%' }} onClick={() => setIsLogging(true)}>
                            <ListIcon/>
                        </Button>
                    </Grid>
                </Grid>
            </div>
        </LocalizationProvider>
    )
}
