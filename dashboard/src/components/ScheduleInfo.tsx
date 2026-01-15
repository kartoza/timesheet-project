import React, {useEffect, useState} from 'react';
import {Tooltip} from '@mui/material';
import NotesIcon from '@mui/icons-material/Notes';
import '../styles/Schedule.scss';
import {generateColor} from "../utils/Theme";

interface ScheduleInfoProps {
    data?: any,
    scheduleClicked?: any,
    timerRunning?: boolean
}


export default function ScheduleInfo(props: ScheduleInfoProps) {
    const [scheduleDate, setScheduleDate] = useState<any>(null)
    const [rawDates, setRawDates] = useState<string[]>([])
    const [scheduleData, setScheduleData] = useState<any>(null)

    const todayFormatted = new Date().toLocaleString('default', { day: 'numeric', month: 'short' });

    function getDayIndex(startTime: string, rawDatesArray: string[]): number {
        const startDate = new Date(startTime);
        startDate.setHours(0, 0, 0, 0);

        return rawDatesArray.findIndex(dateStr => {
            const date = new Date(dateStr);
            date.setHours(0, 0, 0, 0);
            return date.getTime() === startDate.getTime();
        });
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
                setRawDates(result.dates)
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
        <div style={{ display: 'flex', width: '100%' }}>
            {scheduleDate ? scheduleDate.map((dateString: string, index: number) => (
                <div
                    key={index}
                    className={"schedule-date " + ((dateString === todayFormatted) ? ' schedule-date-today' : '')}
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => window.location.href = '/planning'}
                >
                    {dateString}
                </div>
            )) : null}
        </div>
        {scheduleDate && scheduleData && rawDates.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {(() => {
                    const schedules = scheduleData.filter((s: any) => s.schedule);
                    const rows: any[][] = [];

                    schedules.forEach((schedule: any) => {
                        const dayIndex = getDayIndex(schedule.startTime, rawDates);
                        if (dayIndex === -1) return;

                        const endIndex = dayIndex + schedule.duration - 1;

                        // Find a row where this schedule fits without overlap
                        let placedInRow = -1;
                        for (let r = 0; r < rows.length; r++) {
                            const hasOverlap = rows[r].some((item: any) => {
                                const itemStart = item.dayIndex;
                                const itemEnd = itemStart + item.duration - 1;
                                return !(endIndex < itemStart || dayIndex > itemEnd);
                            });
                            if (!hasOverlap) {
                                placedInRow = r;
                                break;
                            }
                        }

                        if (placedInRow === -1) {
                            placedInRow = rows.length;
                            rows.push([]);
                        }

                        rows[placedInRow].push({ ...schedule, dayIndex });
                    });

                    return rows.map((row, rowIndex) => (
                        <div key={rowIndex} style={{ display: 'flex', width: '100%', position: 'relative', height: '70px' }}>
                            {row.map((schedule: any, index: number) => {
                                const leftPercent = (schedule.dayIndex / 5) * 100;
                                const widthPercent = (schedule.duration / 5) * 100;

                                const handleClick = () => {
                                    if (props.timerRunning) {
                                        alert('Please stop the running timer first.');
                                        return;
                                    }
                                    props.scheduleClicked(
                                        schedule.schedule.project_id,
                                        schedule.schedule.project_name,
                                        schedule.schedule.task_id,
                                        schedule.schedule.task_label
                                    );
                                };

                                return (
                                    <Tooltip
                                        key={index}
                                        title={schedule.schedule.notes || ''}
                                        arrow
                                        placement="top"
                                        enterDelay={500}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: `${leftPercent}%`,
                                                width: `${widthPercent}%`,
                                                cursor: props.timerRunning ? 'not-allowed' : 'pointer',
                                                backgroundColor: generateColor(schedule.schedule.project_name),
                                                padding: '8px',
                                                boxSizing: 'border-box',
                                                height: '70px'
                                            }}
                                            className="hover-animation schedule-item"
                                            onClick={handleClick}
                                        >
                                            <div className={'schedule-project-name'}>{schedule.schedule.project_name}</div>
                                            <div style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>{schedule.schedule.task_label}</div>
                                            {schedule.schedule.notes ?
                                                <div style={{
                                                    marginTop: 2,
                                                    alignItems: 'center',
                                                }}>
                                                    <span style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        📝 {schedule.schedule.notes.split('\n')[0]}
                                                    </span>
                                                </div> : null}
                                        </div>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    ));
                })()}
            </div>
        ) : null}
    </div>)
}
