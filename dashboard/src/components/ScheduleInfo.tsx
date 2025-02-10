import React, {useEffect, useState, Suspense} from 'react';
import {Grid} from "@mui/material";
import '../styles/Schedule.scss';
import {generateColor} from "../utils/Theme";

interface ScheduleInfoProps {
    data?: any,
    scheduleClicked?: any
}


export default function ScheduleInfo(props: ScheduleInfoProps) {
    const [scheduleDate, setScheduleDate] = useState<any>(null)
    const [scheduleData, setScheduleData] = useState<any>(null)

    const todayFormatted = new Date().toLocaleString('default', { day: 'numeric', month: 'short' });

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
                const grids:any = []
                for (const schedule of result.schedules) {
                    grids.push({
                        'duration': schedule.duration,
                        'schedule': schedule.id ? schedule : null,
                        'startTime': schedule.start_time,
                        'endTime': schedule.end_time
                    })
                }
                setScheduleData(grids);
            })
    }, [])
    return (<div className={'schedule-container'}>
        <Grid container>
            {scheduleDate ? scheduleDate.map((dateString: string) => (
                <Grid className={"schedule-date " + ((dateString === todayFormatted) ? ' schedule-date-today' : '')} item xs={2.4} onClick={() => window.location.href= '/planning'}>
                    {dateString}
                </Grid>)) : ''}
        </Grid>
        {scheduleDate && scheduleData ? <Grid container>
            { scheduleData.map((schedule: any) => (
                <Grid style={{ cursor: 'pointer', backgroundColor: schedule.schedule ? generateColor(schedule.schedule.project_name) : 'inherit' }}
                    className={(schedule.schedule ? "hover-animation schedule-item" : "schedule-empty")} item xs={2.4 * schedule.duration}
                    onClick={() => {
                        props.scheduleClicked(
                          schedule.schedule.project_id,
                          schedule.schedule.project_name,
                          schedule.schedule.task_id,
                          schedule.schedule.task_label
                        );
                    }}
                >
                    {schedule.schedule ? (
                          <div>
                          <div className={'schedule-project-name'}>{schedule.schedule.project_name}</div>
                          <div>{schedule.schedule.task_label}</div>
                          {schedule.schedule.notes ?
                            <div style={{marginTop: 2}}>📝
                                {schedule.schedule.notes.split('\n').map(function (item: string) {
                                    return (
                                      <span>
                                                {item}
                                          <br/>
                                            </span>
                                    )
                                })}
                            </div> : null}
                      </div>
                    ) : null}
                </Grid>
            ))}
        </Grid> : null}
    </div>)
}
