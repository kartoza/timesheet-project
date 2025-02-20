import { TextField, CircularProgress, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import { LocalizationProvider, DatePicker, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import moment from "moment";
import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
    useAddTimesheetMutation,
    useUpdateTimesheetMutation,
    useClearSubmittedTimesheetsMutation, TimeLog
} from "../services/api";
import { addHours, formatTime } from "../utils/time";
import TButton from "../loadable/Button";
import { ListIcon, PlayCircleIcon, ClearAllIcon } from "../loadable/Icon";
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RunningTime from "./RunningTime";



interface TimeCardProps {
    updateTimeLog?: any | null,
    runningTimeLog?: any | null,
    editingTimeLog?: any | null,
    toggleTimer?: any,
    task?: any | null,
    project?: any | null,
    activity?: any | null,
    description?: String | '',
    parent?: string
    clearAllFields?: any,
    isUnavailable?: boolean
}


let interval: any = null;

export const TimeCard = forwardRef(({
    runningTimeLog,
    editingTimeLog,
    toggleTimer,
    task,
    project,
    activity,
    description,
    parent,
    isUnavailable,
    clearAllFields }: TimeCardProps, ref) => {
    const [startTime, setStartTime] = React.useState<any | null>(new Date());
    const [endTime, setEndTime] = React.useState<any | null>(null);
    const [hours, setHours] = React.useState<Number | null>(null);
    const [hourString, setHourString] = React.useState<string>('');
    const [addButtonDisabled, setAddButtonDisabled] = React.useState(true);
    const [startButtonDisabled, setStartButtonDisabled] = React.useState(true);
    const [isLogging, setIsLogging] = useState(false);
    const [runningTime, setRunningTime] = useState('00:00:00');
    const [localRunningTimeLog, setLocalRunningTimeLog] = useState<any | null>(null);
    const [updatedTimesheet, setUpdatedTimesheet] = useState<any>(null)
    const [newTimesheet, setNewTimesheet] = useState<any>(null)
    const [isEndTime, setIsEndTime] = React.useState<boolean>(false);
    const [retryCount, setRetryCount] = useState(0);
    const [actionType, setActionType] = useState(""); // "submit" or "start"

    const [addTimesheet, { isLoading: isUpdating, isSuccess: isAddSuccess, isError: isAddError, error: addError, data: newData }] = useAddTimesheetMutation();
    const [updateTimesheet, {  isLoading: isUpdateLoading, isSuccess: isUpdateSuccess, isError: isUpdateError, data: updatedData }] = useUpdateTimesheetMutation();
    const [clearTimesheets, {
        isLoading: isClearLoading,
        isSuccess: isClearSuccess, isError: isClearError }] = useClearSubmittedTimesheetsMutation();

    useEffect(() => {
        setUpdatedTimesheet(updatedData)
    }, [updatedData])

    useEffect(() => {
        setNewTimesheet(newData)
    }, [newData])

    useEffect(() => {
        setAddButtonDisabled(startTime == null || hours == null || !activity)
        setStartButtonDisabled(!activity)
    }, [startTime, hours, task, activity, description])

    useEffect(() => {
        if (isEndTime && !endTime && hours) {
            let newDate = new Date(startTime.getTime());
            // @ts-ignore
            newDate.setHours(newDate.getHours() + parseFloat(hours));
            setEndTime(newDate);
        }
    }, [isEndTime]);


    const clearData = useCallback((clearActivity = true) => {
        setHours(null);
        setHourString('')
        clearAllFields(clearActivity);
        setUpdatedTimesheet(null)
        setNewTimesheet(null)
    }, [clearAllFields])

    useEffect(() => {
        if (isAddSuccess && newTimesheet) {
            if (newTimesheet.running) {
                toggleTimer(true)
                setLocalRunningTimeLog(newTimesheet);
            } else {
                setLocalRunningTimeLog(null)
                if (endTime) {
                    setStartTime(endTime)
                }
                clearData(false);
            }
        }
    }, [isAddSuccess, newTimesheet, clearData])

    useEffect(() => {
        if (localRunningTimeLog || editingTimeLog) {
            if (updatedTimesheet && !updatedTimesheet.running) {
                toggleTimer(false);
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
            const _startTime = moment(editingTimeLog.from_time, 'YYYY-MM-DD hh:mm:ss').toDate()
            setStartTime(_startTime)

            let newDate = new Date(_startTime.getTime());
            newDate.setHours(newDate.getHours() + editingTimeLog.hours);
            setEndTime(newDate);
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
        runningTimeClone['project'] = {
            'id': project ? project.id : ''
        }
        runningTimeClone['description'] = description;
        runningTimeClone['end_time'] = formatTime(new Date());
        updateTimesheet(runningTimeClone);
    }

    const resetStartTime = () => {
        setStartTime(moment().toDate());
    }

    const updateHours = (data: TimeLog) => {
        // @ts-ignore
        setHours(data.hours);
        setHourString(data.hours);
        const _startTime = moment(data.from_time, 'YYYY-MM-DD hh:mm:ss').toDate();
        setStartTime(_startTime);
    }

    useImperativeHandle(ref, () => ({
        startButtonClicked,
        updateHours,
        resetStartTime,
    }));

    const submitTimesheet = useCallback(() => {
        let endTime: any = null;
        setAddButtonDisabled(true);
        if (hours != null && startTime) {
            const startTimeCopy = new Date(startTime.toISOString());
            endTime = hours > 0 ? addHours(hours, startTimeCopy) : startTimeCopy;
        }
        if (!endTime || !startTime || !activity) {
          return;
        }
        const task_id = task ? task.id : "-";
        let _startTime = typeof startTime.toDate === "function" ? startTime.toDate() : startTime;
        const startTimeStr = formatTime(_startTime);
        const endTimeStr = formatTime(endTime);
        const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        addTimesheet({
            start_time: startTimeStr,
            end_time: endTimeStr,
            task: { id: task_id },
            activity: { id: activity.id },
            project: { id: project ? project.id : "" },
            description: description,
            timezone: currentTimeZone,
        });
    }, [addTimesheet, hours, startTime, activity, task, project, description]);

    const startTimesheet = useCallback(
        (startFromZero = false) => {
            setIsLogging(false);
            setStartButtonDisabled(true);
            clearInterval(interval);

            if (!startTime || !activity) {
                return;
            }
            const task_id = task ? task.id : "-";
            const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            let _runningTime = runningTime;
            if (startFromZero) {
                _runningTime = "00:00:00";
            }
            let _startTime = formatTime(new Date());
            if (_runningTime !== "00:00:00") {
            const [hrs, mins, secs] = _runningTime.split(":").map(Number);
            const runningTimeInMs = ((hrs * 60 * 60) + (mins * 60) + secs) * 1000;
            const newStartTime = new Date(new Date().getTime() - runningTimeInMs);
                _startTime = formatTime(newStartTime);
            }
            addTimesheet({
                start_time: _startTime,
                task: { id: task_id },
                activity: { id: activity.id },
                project: { id: project ? project.id : "" },
                description: description,
                timezone: currentTimeZone,
                parent: parent,
            });
        },
        [addTimesheet, startTime, activity, task, runningTime, project, description, parent, interval]
    );

  const addButtonClicked = () => {
    setRetryCount(0);
    setActionType("submit");
    submitTimesheet();
  };

  const startButtonClicked = (startFromZero = false) => {
    setRetryCount(0);
    setActionType("start");
    startTimesheet(startFromZero);
  };

  useEffect(() => {
    if (isAddError) {
      if (retryCount < 3) {
        const timer = setTimeout(() => {
          if (actionType === "submit") {
            setAddButtonDisabled(true);
            submitTimesheet();
          } else if (actionType === "start") {
            setStartButtonDisabled(true);
            startTimesheet(false);
          }
          setRetryCount((prev) => prev + 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setStartButtonDisabled(false);
        setAddButtonDisabled(false);
        alert("Failed to add timesheet, please try again later.");
      }
    }
  }, [isAddError, retryCount, actionType, submitTimesheet, startTimesheet, addError]);


    const submitEditedTimeLog = () => {
        let endTime: any = null
        if (hours != null && startTime) {
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
            editingTimeClone['project'] = {
                'id': project ? project.id : ''
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

    const handleClearSubmitted = () => {
        // eslint-disable-next-line no-restricted-globals
        let confirmed = confirm('Are you sure you want to clear submitted timesheets?');
        if (confirmed) {
            clearTimesheets({})
        }
    }

    const updateCurrentHours = (_startTime: Date | null, _endTime: Date | null) => {
        if (_startTime && _endTime) {
            [_startTime, _endTime].forEach(date => {
                const minutes = date.getMinutes();
                const seconds = date.getSeconds();
                if (seconds >= 30) {
                    date.setMinutes(minutes + 1);
                }
                date.setSeconds(0, 0);
            });

            let newHours = (_endTime.getTime() - _startTime.getTime()) / 3600000;
            newHours = parseFloat(newHours.toFixed(2));

            if (newHours > 0) {
                setHours(newHours);
                setHourString(newHours + '');
            } else {
                setHours(null);
                setHourString('');
            }
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            { isLogging || editingTimeLog ?
            <div>
                <CardContent sx={{ paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
                    <Grid container spacing={0.6}>
                        <Grid size={7} className="time-picker">
                            <DatePicker
                                value={startTime}
                                onChange={(newValue) => setStartTime(newValue)}
                                format="dd/MM/yyyy"
                                className="date-picker-input"
                            />
                        </Grid>
                        <Grid size={1} style={{marginTop: 15}}><Typography color={'text.primary'}>:</Typography></Grid>
                        <Grid size={4} className="time-picker">
                            <TimePicker
                                ampm={false}
                                value={startTime}
                                onChange={(newValue) => {
                                    setStartTime(newValue)
                                    updateCurrentHours(newValue, endTime)
                                }}
                                viewRenderers={{
                                    hours: renderTimeViewClock,
                                    minutes: renderTimeViewClock,
                                    seconds: renderTimeViewClock,
                                }}
                            />
                        </Grid>
                    </Grid>
                    <Grid container spacing={0.6}>
                        <Grid size={10}>
                            { isEndTime ? <div style={{marginLeft: "-20px"}}><TimePicker
                                ampm={false}
                                value={endTime}
                                onChange={(newValue) => {
                                    setEndTime(newValue);
                                    updateCurrentHours(startTime, newValue);
                                }}
                                viewRenderers={{
                                    hours: renderTimeViewClock,
                                    minutes: renderTimeViewClock,
                                    seconds: renderTimeViewClock,
                                }}
                              /></div> :
                            <TextField
                              error={hourString.length > 4 && !hours}
                              value={hourString}
                              id="hour"
                              onChange={(event) => {
                                  const value = event.target.value;
                                  setHours(null)
                                  setHourString(value)
                                  if (!value) {
                                      return
                                  }

                                  let _startTime = startTime;
                                  if (moment.isMoment(startTime)) {
                                      _startTime = _startTime.toDate();
                                      setStartTime(_startTime);
                                  }
                                  let newDate = new Date(_startTime.getTime());

                                  // @ts-ignore
                                  if (!isNaN(value)) {
                                      const _hours = parseFloat(value)
                                      setHours(_hours)
                                      // @ts-ignore
                                      newDate.setHours(newDate.getHours() + _hours);
                                      setEndTime(newDate);

                                      return
                                  }
                                  const timeData = value.match(/(0?[0-9]|1[0-2])(:|.)[0-9]{2}/g)
                                  if (timeData && timeData.length > 0) {
                                      const timeDataString = timeData[0]
                                      let _hours = 0
                                      if (timeDataString.includes(':')) {
                                          const minutes = timeDataString.split(':')[1]
                                          const hour = timeDataString.split(':')[0]
                                          _hours = parseFloat((parseFloat(hour) + (parseFloat(minutes)/60)).toFixed(2))
                                      } else {
                                          _hours = parseFloat(timeDataString)
                                      }
                                      setHours(_hours)
                                      // @ts-ignore
                                      newDate.setHours(newDate.getHours() + _hours);
                                      setEndTime(newDate);
                                  }
                              }}
                              type="text"
                              helperText='HH:MM or decimal'
                              InputProps={{
                                  inputProps: { min: 0 }
                              }}
                              label="Hours" variant="standard" sx={{ width: "100%" }} />
                            }
                        </Grid>
                        <Grid size={2}>
                            <TButton variant="text" onClick={() => setIsEndTime(!isEndTime)} style={{ minWidth: 0, paddingLeft: 4, paddingRight: 4, marginTop: 12}}>
                                <HourglassEmptyIcon/>
                            </TButton>
                        </Grid>
                    </Grid>
                </CardContent>
                <CardActions sx={{ justifyContent: "center", padding: 0, marginBottom: '10px', marginTop: '4px' }}>
                    {editingTimeLog ?
                        <div style={{width: '100%'}}>
                            <TButton color="warning" variant="contained" size="small" sx={{width: '50%', marginTop: -1}}
                                    onClick={cancelEditingTimeLog}
                                    disabled={isUpdateLoading || isUnavailable}
                                    disableElevation>Cancel</TButton>
                            <TButton color="success" variant="contained" size="small" sx={{width: '50%', marginTop: -1}}
                                onClick={submitEditedTimeLog}
                                disabled={addButtonDisabled || isUpdateLoading || isUnavailable}
                                disableElevation>{isUpdateLoading ?
                            <CircularProgress color="inherit" size={20}/> : "Save"}</TButton>
                        </div>:
                        <TButton variant="contained" size="small" sx={{width: '100%', marginTop: -1}}
                                onClick={addButtonClicked}
                                disabled={addButtonDisabled || isUpdating || isUnavailable}
                                disableElevation>{isUpdating ?
                            <CircularProgress color="inherit" size={20}/> : "Add"}</TButton>
                    }
                </CardActions>
            </div> :
            <div style={{marginTop: '8px',  marginBottom: '0.5em'}}>
                <RunningTime disabled={localRunningTimeLog} runningTime={runningTime} onChange={(newRunningTime) => setRunningTime(newRunningTime)}/>
                {/*<Typography style={{ color:'#1d575c'}} variant={'h3'}>{runningTime}</Typography>*/}
                <CardContent sx={{ paddingLeft: 0, paddingRight: 0 }}>
                        {localRunningTimeLog ?
                          <TButton color="info" variant="contained" size="small"
                                  sx={{width: '100%', height: '58px', marginTop: -1}}
                                  onClick={stopButtonClicked}
                                  disabled={startButtonDisabled}
                                  disableElevation>{isUpdateLoading ?
                            <CircularProgress color="inherit" size={20}/> : "STOP"}</TButton> :
                          <TButton color="success" variant="contained" size="small"
                                  sx={{width: '100%', height: '58px', marginTop: -1}}
                                  onClick={() => startButtonClicked(false)}
                                  disabled={startButtonDisabled || isUnavailable}
                                  disableElevation>{isUpdating ?
                            <CircularProgress color="inherit" size={20}/> : "START"}</TButton>
                        }
                </CardContent>
            </div> }
            <div style={{ marginTop: '3px' }}>
                <Grid container spacing={0.6}>
                    <Grid size={6}>
                        <TButton variant={'outlined'} disabled={!isLogging || editingTimeLog} color={'success'} style={{ width: '100%' }} onClick={() => setIsLogging(false)}>
                            <PlayCircleIcon/>
                        </TButton>
                    </Grid>
                    <Grid size={6}>
                        <TButton variant={'outlined'} disabled={isLogging || editingTimeLog || localRunningTimeLog} color={'success'} style={{ width: '100%' }} onClick={() => setIsLogging(true)}>
                            <ListIcon/>
                        </TButton>
                    </Grid>
                </Grid>
            </div>
            <div style={{ marginTop: 'auto'}}>
                <TButton
                    onClick={handleClearSubmitted}
                    style={{ width: '100%' }}
                    startIcon={<ClearAllIcon/>}
                    variant={'outlined'}
                    color={'warning'}>Clear Submitted</TButton>
            </div>
        </LocalizationProvider>
    )
});

export default TimeCard;
