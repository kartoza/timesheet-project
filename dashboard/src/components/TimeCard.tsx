import { TextField, CircularProgress, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import { LocalizationProvider, DatePicker, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import moment from "moment";
import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle, useRef } from "react";
import {
    useAddTimesheetMutation,
    useUpdateTimesheetMutation,
    useClearSubmittedTimesheetsMutation,
    usePauseTimesheetMutation,
    TimeLog
} from "../services/api";
import { addHours, formatTime } from "../utils/time";
import TButton from "../loadable/Button";
import { ListIcon, PlayCircleIcon, ClearAllIcon } from "../loadable/Icon";
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import StopCircleIcon from "@mui/icons-material/StopCircle";
import RunningTime from "./RunningTime";



interface TimeCardProps {
    updateTimeLog?: any | null,
    runningTimeLog?: any | null,
    pausedTimeLog?: any | null,
    editingTimeLog?: any | null,
    toggleTimer?: any,
    task?: any | null,
    project?: any | null,
    activity?: any | null,
    description?: String | '',
    parent?: string
    clearAllFields?: any,
    isUnavailable?: boolean,
    initialAccumulatedTimeMs?: number
}


export const TimeCard = forwardRef(({
    runningTimeLog,
    pausedTimeLog: pausedTimeLogProp,
    editingTimeLog,
    toggleTimer,
    task,
    project,
    activity,
    description,
    parent,
    isUnavailable,
    clearAllFields,
    initialAccumulatedTimeMs = 0 }: TimeCardProps, ref) => {
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
    const [pauseTimesheet, { isLoading: isPauseLoading }] = usePauseTimesheetMutation();
    const [pausedTimeLog, setPausedTimeLog] = useState<any | null>(null);
    const [accumulatedTimeMs, setAccumulatedTimeMs] = useState<number>(0); // Time from parent (paused) timelog in milliseconds
    const runningTimeRef = useRef<string>('00:00:00'); // Ref to track current running time for pause
    const intervalRef = useRef<any>(null);

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
                setPausedTimeLog(null);
            } else {
                setLocalRunningTimeLog(null)
                if (endTime) {
                    setStartTime(endTime)
                }
                clearData(false);
            }
        }
    }, [isAddSuccess, newTimesheet])

    useEffect(() => {
        if (localRunningTimeLog || editingTimeLog) {
            if (updatedTimesheet && !updatedTimesheet.running) {
                toggleTimer(false);
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                setStartButtonDisabled(true);
                setRunningTime('00:00:00');
                setAccumulatedTimeMs(0);
                setLocalRunningTimeLog(null);
                clearData();
            }
        }
    }, [localRunningTimeLog,
        editingTimeLog,
        isUpdateSuccess,
        updatedTimesheet])

    useEffect(() => {
        if (editingTimeLog) {
            setHours(editingTimeLog.hours);
            setHourString(editingTimeLog.hours);
            const _startTime = moment(editingTimeLog.from_time, 'YYYY-MM-DD HH:mm:ss').toDate()
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

    useEffect(() => {
        if (initialAccumulatedTimeMs > 0) {
            setAccumulatedTimeMs(initialAccumulatedTimeMs);
        }
    }, [initialAccumulatedTimeMs])

    useEffect(() => {
        if (pausedTimeLogProp && !pausedTimeLog && !localRunningTimeLog) {
            setPausedTimeLog(pausedTimeLogProp);
            // Use all_hours (total accumulated time across all sessions) for display
            if (pausedTimeLogProp.all_hours) {
                const totalMs = parseFloat(pausedTimeLogProp.all_hours) * 3600 * 1000;
                setAccumulatedTimeMs(totalMs);
                setRunningTime(moment.utc(totalMs).format("HH:mm:ss"));
            } else if (pausedTimeLogProp.from_time && pausedTimeLogProp.to_time) {
                const fromTime = moment(pausedTimeLogProp.from_time, 'YYYY-MM-DD HH:mm:ss');
                const toTime = moment(pausedTimeLogProp.to_time, 'YYYY-MM-DD HH:mm:ss');
                const diff = toTime.diff(fromTime);
                setRunningTime(moment.utc(diff).format("HH:mm:ss"));
            }
        }
    }, [pausedTimeLogProp])

    const updateTime = useCallback(() => {
        if (!localRunningTimeLog) return;
        let fromTimeObj = moment(
          localRunningTimeLog.from_time,
          'YYYY-MM-DD HH:mm:ss');
        let diff = moment().diff(fromTimeObj);
        const totalDiff = diff + accumulatedTimeMs;
        const timeString = moment.utc(totalDiff).format("HH:mm:ss");
        setRunningTime(timeString);
        runningTimeRef.current = timeString;
    }, [localRunningTimeLog, accumulatedTimeMs])

    useEffect(() => {
        if (localRunningTimeLog) {
            setStartButtonDisabled(false)
            updateTime();
            intervalRef.current = setInterval(updateTime, 1000);

            const link = document.querySelector("link[rel~='icon']") as HTMLAnchorElement | null;
            if (link) {
                link.href = '/static/running-favicon.ico';
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [localRunningTimeLog, updateTime])

    const stopButtonClicked = async () => {
        if (!localRunningTimeLog) return;
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        const link = (
          document.querySelector("link[rel~='icon']") as HTMLAnchorElement | null
        );
        if (link) {
            link.href = '/static/timesheet-logo.png';
        }
        const runningTimeClone = Object.assign({}, localRunningTimeLog);
        let task_id = task ? task.id : '-';
        runningTimeClone['task'] = {
            'id': task_id
        }
        runningTimeClone['activity'] = {
            'id': activity ? activity.id : localRunningTimeLog.activity_id
        }
        runningTimeClone['project'] = {
            'id': project ? project.id : (localRunningTimeLog.project_id || '')
        }
        runningTimeClone['description'] = description || localRunningTimeLog.description;
        runningTimeClone['end_time'] = formatTime(new Date());
        updateTimesheet(runningTimeClone);
    }

    const pauseButtonClicked = async () => {
        if (!localRunningTimeLog) return;
        const capturedTime = runningTimeRef.current;
        try {
            const result = await pauseTimesheet({ id: localRunningTimeLog.id }).unwrap();
            setPausedTimeLog(result);
            setLocalRunningTimeLog(null);
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            const [hrs, mins, secs] = capturedTime.split(':').map(Number);
            const totalMs = ((hrs * 60 * 60) + (mins * 60) + secs) * 1000;
            setAccumulatedTimeMs(totalMs);
            const link = document.querySelector(
              "link[rel~='icon']"
            ) as HTMLAnchorElement | null;
            if (link) {
                link.href = '/static/timesheet-logo.png';
            }
        } catch (e) {
            console.error('Failed to pause timesheet:', e);
        }
    }

    const resumeFromPause = () => {
        if (!pausedTimeLog) return;
        if (pausedTimeLog.from_time && pausedTimeLog.to_time) {
            const fromTime = moment(pausedTimeLog.from_time, 'YYYY-MM-DD HH:mm:ss');
            const toTime = moment(pausedTimeLog.to_time, 'YYYY-MM-DD HH:mm:ss');
            const pausedDuration = toTime.diff(fromTime);
            const existingHoursMs = pausedTimeLog.all_hours ? (parseFloat(pausedTimeLog.all_hours) * 3600 * 1000) : pausedDuration;
            setAccumulatedTimeMs(existingHoursMs);
        }

        const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const _startTime = formatTime(new Date());
        addTimesheet({
            start_time: _startTime,
            task: { id: pausedTimeLog.task_id || '-' },
            activity: { id: pausedTimeLog.activity_id },
            project: { id: pausedTimeLog.project_id || '' },
            description: pausedTimeLog.description,
            timezone: currentTimeZone,
            parent: pausedTimeLog.id,
        });

        setPausedTimeLog(null);
    }

    const clearPausedState = async () => {
        if (pausedTimeLog) {
            const pausedClone: any = {
                id: pausedTimeLog.id,
                task: { 'id': pausedTimeLog.task_id || '-' },
                activity: { 'id': pausedTimeLog.activity_id },
                project: { 'id': pausedTimeLog.project_id || '' },
                description: pausedTimeLog.description || '',
                start_time: pausedTimeLog.from_time,
                end_time: pausedTimeLog.to_time,
                is_paused: false,
                editing: true, // Allow update even though end_time exists
            };
            try {
                await updateTimesheet(pausedClone).unwrap();
            } catch (e) {
                console.error('Failed to clear paused state:', e);
            }
        }
        setPausedTimeLog(null);
        setRunningTime('00:00:00');
        setAccumulatedTimeMs(0);
        clearData();
        toggleTimer(false);
    }

    const resetStartTime = () => {
        setStartTime(moment().toDate());
    }

    const updateHours = (data: TimeLog) => {
        // @ts-ignore
        setHours(data.hours);
        setHourString(data.hours);
        const _startTime = moment(data.from_time, 'YYYY-MM-DD HH:mm:ss').toDate();
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
            clearInterval(intervalRef.current);
            intervalRef.current = null;
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
        [addTimesheet, startTime, activity, task, runningTime, project, description, parent]
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
  }, [isAddError, retryCount, actionType, addError]);


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
                                      const wholeHours = Math.floor(_hours);
                                      const minutes = (_hours - wholeHours) * 60;

                                      // @ts-ignore
                                      newDate.setHours(newDate.getHours() + _hours);
                                      newDate.setMinutes(newDate.getMinutes() + minutes);

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
                                      const wholeHours = Math.floor(_hours);
                                      const minutes = (_hours - wholeHours) * 60;

                                      // @ts-ignore
                                      newDate.setHours(newDate.getHours() + _hours);
                                      newDate.setMinutes(newDate.getMinutes() + minutes);

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
                <RunningTime disabled={localRunningTimeLog || pausedTimeLog} runningTime={runningTime} onChange={(newRunningTime) => setRunningTime(newRunningTime)}/>
                {/*<Typography style={{ color:'#1d575c'}} variant={'h3'}>{runningTime}</Typography>*/}
                <CardContent sx={{ paddingLeft: 0, paddingRight: 0 }}>
                        {localRunningTimeLog ? (
                          <Grid container spacing={1}>
                            <Grid size={6}>
                              <TButton color="warning" variant="contained" size="small"
                                      sx={{width: '100%', height: '58px', marginTop: -1}}
                                      onClick={pauseButtonClicked}
                                      disabled={isPauseLoading}
                                      disableElevation>{isPauseLoading ?
                                <CircularProgress color="inherit" size={20}/> : <><PauseCircleIcon sx={{mr: 0.5}}/> PAUSE</>}</TButton>
                            </Grid>
                            <Grid size={6}>
                              <TButton color="info" variant="contained" size="small"
                                      sx={{width: '100%', height: '58px', marginTop: -1}}
                                      onClick={stopButtonClicked}
                                      disabled={isUpdateLoading}
                                      disableElevation>{isUpdateLoading ?
                                <CircularProgress color="inherit" size={20}/> : <><StopCircleIcon sx={{mr: 0.5}}/> STOP</>}</TButton>
                            </Grid>
                          </Grid>
                        ) : pausedTimeLog ? (
                          <Grid container spacing={1}>
                            <Grid size={6}>
                              <TButton color="success" variant="contained" size="small"
                                      sx={{width: '100%', height: '58px', marginTop: -1}}
                                      onClick={resumeFromPause}
                                      disabled={isUpdating || isUnavailable}
                                      disableElevation>{isUpdating ?
                                <CircularProgress color="inherit" size={20}/> : <><PlayCircleIcon sx={{mr: 0.5}}/> RESUME</>}</TButton>
                            </Grid>
                            <Grid size={6}>
                              <TButton color="info" variant="contained" size="small"
                                      sx={{width: '100%', height: '58px', marginTop: -1}}
                                      onClick={clearPausedState}
                                      disabled={isUpdateLoading}
                                      disableElevation>{isUpdateLoading ?
                                <CircularProgress color="inherit" size={20}/> : <><StopCircleIcon sx={{mr: 0.5}}/> STOP</>}</TButton>
                            </Grid>
                          </Grid>
                        ) : (
                          <TButton color="success" variant="contained" size="small"
                                  sx={{width: '100%', height: '58px', marginTop: -1}}
                                  onClick={() => startButtonClicked(false)}
                                  disabled={startButtonDisabled || isUnavailable}
                                  disableElevation>{isUpdating ?
                            <CircularProgress color="inherit" size={20}/> : "START"}</TButton>
                        )}
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
