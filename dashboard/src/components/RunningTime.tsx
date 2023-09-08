import React, {useEffect, useState, Suspense} from 'react';
import '../styles/RunningTime.scss';


export default function RunningTime(props: any) {
    const [hours, setHours] = useState<string>('00')
    const [minutes, setMinutes] = useState<string>('00')
    const [seconds, setSeconds] = useState<string>('00')
    const [prevRunningTime, setPrevRunningTime] = useState('');

    useEffect(() => {
        if (props.runningTime !== prevRunningTime) {
            const splitTime = props.runningTime.split(':');
            setHours(splitTime[0]);
            setMinutes(splitTime[1]);
            setSeconds(splitTime[2]);
            setPrevRunningTime(props.runningTime);
        }
    }, [props.runningTime, prevRunningTime]);

    useEffect(() => {
        const newTime = '' + [hours, minutes, seconds].join(':');
        if (newTime !== props.runningTime) {
            props.onChange(newTime);
            setPrevRunningTime(newTime);
        }

    }, [hours, minutes, seconds, prevRunningTime, props.runningTime]);

    return (
        <div style={{ display: 'flex'}}>
            <input type={'text'}
                   disabled={props.disabled}
                   value={hours}
                   pattern="[0-9]"
                   maxLength={2}
                   onChange={(e) => {
                       const value = e.target.value;
                       if (value === '') {
                           setHours('00')
                           return
                       }
                       if (/^\d{0,2}$/.test(value)) {
                           setHours(value);
                       }
                   }}
                   className={'numberBox'}/>
            <div className={'timeSeparator'}>:</div>
            <input type={'text'}
                   value={minutes}
                   disabled={props.disabled}
                   pattern="[0-9]"
                   maxLength={2}
                   onChange={(e) => {
                       let value = e.target.value;
                       if (value === '') {
                           setMinutes('00')
                           return
                       }
                       if (/^\d{0,2}$/.test(value)) {
                           if (parseInt(value) >= 60) {
                               setMinutes('59')
                               return;
                           }
                           setMinutes(value);
                       }
                   }}
                   className={'numberBox'}/>
            <div className={'timeSeparator'}>:</div>
            <input type={'text'}
                   value={seconds}
                   disabled={props.disabled}
                   pattern="[0-9]"
                   maxLength={2}
                   onChange={(e) => {
                       const value = e.target.value;
                       if (value === '') {
                           setSeconds('00')
                           return
                       }
                       if (/^\d{0,2}$/.test(value)) {
                           if (parseInt(value) >= 60) {
                               setSeconds('59')
                               return;
                           }
                           setSeconds(value);
                       }
                   }}
                   className={'numberBox'}/>
        </div>
    )
}