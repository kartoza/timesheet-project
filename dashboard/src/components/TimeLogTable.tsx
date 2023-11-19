import '../styles/TimeLogTable.scss';
import Card from "@mui/material/Card";
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import {TimeLog} from "../services/api";
import React from "react";
import { signal, computed } from '@preact/signals';
import {TimeLogItem} from "./TimeLogItem";


function TimeLogTable(props: any) {
    const { data, date } = props;

    const totalHoursSignal = signal(0);
    const dateStringSignal = signal('');

    const updateTotalHours = () => {
        let _totalHours = 0;
        for (const timeLogData of data) {
            _totalHours += parseFloat(timeLogData.hours);
        }
        totalHoursSignal.value = Number(_totalHours.toFixed(2));
    }

    const updateDateString = () => {
        dateStringSignal.value = new Date(Date.parse(date)).toDateString();
    }

    updateTotalHours();
    updateDateString();

    const totalHours = () => {
        let _totalHours = 0;
        for (const timeLogData of data) {
            _totalHours += parseFloat(timeLogData.hours)
        }
        return _totalHours.toFixed(2);
    }

    const dateString = () => {
        return new Date(Date.parse(date)).toDateString()
    }

    return (
        <Card>
            <CardHeader
                title={ dateString() }
                subheader={ 'Total: ' + totalHours() }
                className={ 'timelog-card-header' }
                sx={{
                    textAlign: 'left',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    marginBottom: '10px',
                    display: 'flex'
                }}
                titleTypographyProps={{
                    'color': 'text.secondary',
                    'sx': {fontSize: '14px', color: 'white', marginTop: 0.5}
                }}
                subheaderTypographyProps={{
                    'color': 'white',
                    'sx': {marginLeft: "auto"}
                }}
            />
            <CardContent sx={{padding: 0}}>
                {data.map((timeLogData: TimeLog) => {
                  if (!timeLogData.running && !timeLogData.parent) {
                    return (
                      <div key={timeLogData.id}>
                        <TimeLogItem {...timeLogData}/>
                        <Divider sx={{marginBottom: 1}}/>
                      </div>
                    )
                  } else {
                    return null;
                  }
                })}
            </CardContent>
        </Card>
    )
}


export default TimeLogTable;
