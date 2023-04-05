import React, {useEffect, useState, Suspense} from 'react';
import {Grid} from "@mui/material";
import '../styles/Schedule.scss';
import {generateColor} from "../utils/Theme";

interface ScheduleInfoProps {
    data?: any
}


export default function ScheduleInfo(props: ScheduleInfoProps) {
    const [scheduleDate, setScheduleDate] = useState<any>(null)
    const [scheduleData, setScheduleData] = useState<any>(null)

    function getDaysBetweenDates(date1, date2) {
        const oneDay = 1000 * 60 * 60 * 24 // milliseconds in a day
        // @ts-ignore
        const msDifference = Math.abs(new Date(date1) - new Date(date2))
        return Math.round(msDifference / oneDay)
    }

    useEffect(() => {
        fetch('/api/weekly-schedules/', {
            credentials: 'include', method: 'GET', headers: {
                'Accept': 'application/json',
                'X-CSRFToken': (window as any).csrftoken
            },
        })
            .then(response => response.json())
            .then((result: any) => {
                const dates = result.dates.map((dateString: string) => new Date(dateString).toLocaleString('default', {
                    day: 'numeric', month: 'short'
                }))
                setScheduleDate(dates)
                let lastDay = null
                const grids:any = []
                let emptySchedules = 0
                for (const date of result.dates) {
                    for (const schedule of result.schedules) {
                        const startTime = schedule.start_time.split('T')[0]
                        const endTime = schedule.end_time.split('T')[0]
                        if (startTime == date) {
                            if (startTime == result.dates[0]) {
                                grids.push({
                                    'duration': getDaysBetweenDates(endTime, startTime) + 1,
                                    'schedule': schedule,
                                    'startTime': startTime,
                                    'endTime': endTime
                                })
                                lastDay = endTime
                            } else {
                                if (!lastDay || new Date(startTime) <= new Date(lastDay)) {
                                    if (lastDay && getDaysBetweenDates(lastDay, result.dates[result.dates.length - 1]) > 0) {
                                        const emptySchedule = {
                                            'duration': getDaysBetweenDates(lastDay, result.dates[result.dates.length - 1]),
                                            'schedule': null,
                                            'endTime': result.dates[result.dates.length - 1],
                                            'startTime': result.dates[result.dates.indexOf(lastDay) + 1]
                                        }
                                        grids.push(emptySchedule)
                                        emptySchedules += 1
                                    }
                                    const emptySchedule = {
                                        'duration': getDaysBetweenDates(startTime, result.dates[0]),
                                        'schedule': null,
                                        'endTime': result.dates[0],
                                        'startTime': result.dates[result.dates.indexOf(startTime) + 1]
                                    }
                                    grids.push(emptySchedule)
                                    emptySchedules += 1
                                }
                                const duration = getDaysBetweenDates(endTime, startTime) + 1
                                let emptyScheduleFound = false
                                if (emptySchedules > 0) {
                                    let index = 0;
                                    for (const gridSchedule of grids) {
                                        index += 1
                                        if (gridSchedule.schedule) continue
                                        if (gridSchedule.duration == duration && gridSchedule.startTime == startTime && gridSchedule.endTime == endTime) {
                                            grids[index - 1].schedule = schedule
                                            emptyScheduleFound = true
                                            break
                                        }
                                    }
                                }
                                if (!emptyScheduleFound) {
                                    grids.push({
                                        'duration': duration,
                                        'schedule': schedule,
                                        'startTime': startTime,
                                        'endTime': endTime
                                    })
                                }
                                lastDay = endTime
                            }
                        }
                    }
                }
                setScheduleData(grids);
            })
    }, [])
    return (<div className={'schedule-container'}>
        <Grid container>
            {scheduleDate ? scheduleDate.map((dateString: string) => (
                <Grid className="schedule-date" item xs={2.4} onClick={() => window.location.href= '/planning'}>
                    {dateString}
                </Grid>)) : ''}
        </Grid>
        {scheduleDate && scheduleData ? <Grid container>
            { scheduleData.map((schedule: any) => (
                <Grid style={{ backgroundColor: schedule.schedule ? generateColor(schedule.schedule.project_name) : 'inherit' }}
                      className={schedule.schedule ? "schedule-item" : "schedule-empty"} item xs={2.4 * schedule.duration}>
                    {schedule.schedule ? (
                        <div>
                            <div className={'schedule-project-name'}>{schedule.schedule.project_name}</div>
                            <div>{schedule.schedule.task_label}</div>
                        </div>
                    ) : null}
                </Grid>
             ))}
        </Grid> : null}
    </div>)
}
