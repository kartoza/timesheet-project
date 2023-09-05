import {Paper, Typography, ListItem, List} from "@mui/material";
import { useEffect, useState } from "react";
import '../styles/UserActivties.scss'
import Chip from "@mui/material/Chip";
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import HotelIcon from '@mui/icons-material/Hotel';

const green500 = "76, 175, 80";

const successCircle = {
    backgroundColor: `rgb(${green500})`,
    margin: 5,
    width: 10,
    height: 10,
    borderRadius: "50%",
    animation: "pulsing 1.5s infinite"
};

const offlineCircle = {
    backgroundColor: `grey`,
    margin: 5,
    width: 10,
    height: 10,
    borderRadius: "50%",
};

function ActivityStatus({ active }) {
    if (active) {
        return <div style={successCircle}></div>
    } else {
        return <div style={offlineCircle}></div>
    }
}

export default function UserActivities(props: any) {

    const [activities, setActivities] = useState<any>(null)

    useEffect(() => {
        const fetchActivities = () => {
            fetch('/api/user-activities/').then(
                result => result.json()
            ).then(data => (
                setActivities(data)
            ));
        };

        fetchActivities();

        const intervalId = setInterval(() => {
            fetchActivities();
        }, 10000);  // 10 seconds

        return () => clearInterval(intervalId);
    }, []);

    function convertToDateTime(timeStr: string) {
        const currentDate = new Date();
        const [time, period] = timeStr.split(' ');
        const [hour, minute] = time.split(':').map(Number);

        // Convert to 24-hour format
        let hour24;
        if (period === 'PM') {
            hour24 = hour === 12 ? 12 : hour + 12;
        } else {
            hour24 = hour === 12 ? 0 : hour;
        }

        // Create new Date object with current date and converted time
        const newDateTime = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            hour24,
            minute
        );
        return newDateTime;
    }


    const getIcon = (activity: any) => {
        if (activity['clock'] === 'On Leave' || activity['clock'] === '') {
            return <></>
        }
        const dateTime = convertToDateTime(activity['clock']);
        const currentHour = dateTime.getHours();

        let clockTime = <></>;

        if (currentHour >= 5 && currentHour < 18) {
            clockTime = <WbSunnyIcon/>;
        } else {
            if (activity['is_active']) {
                clockTime = <NightsStayIcon/>;
            } else {
                clockTime = <HotelIcon/>;
            }
        }

        return clockTime;
    }

    return (
        <Paper className={'leaderboard-container'}>
            <Typography fontSize={15}>Today's</Typography>
            <List>
                { activities ? activities.map(
                    (data: any, index) => <ListItem key={index} style={{ paddingTop: 5, paddingLeft: 4, paddingBottom: 5, flexDirection: 'column', alignItems: 'flex-start' }} divider>
                        <ListItem disablePadding>
                            <div style={{ paddingRight: 6 }}>
                                <ActivityStatus active={data['is_active']} />
                            </div>
                            <Typography fontSize={12} align={'left'}>{data['first_name'] + ' '}
                                { data['clock'] ?
                                <Chip size={'small'} label={data['clock']}
                                      icon={getIcon(data)}
                                      sx={{ fontSize: 11, paddingLeft: 0, paddingRight: 0}} /> : null }
                            </Typography>
                            <Typography fontSize={12} style={{marginLeft: 'auto'}}>{data['total'].toFixed(2)}</Typography>
                        </ListItem>
                        { data['task'] ?
                        <ListItem disablePadding style={{ paddingBottom: 4, paddingTop: 5 }}>
                            <Typography fontSize={10} style={{ paddingRight: 6 }}>
                                &nbsp;
                            </Typography>
                            <Typography fontSize={12} style={{marginLeft: 'auto'}}>
                                {data['task']} - (<span>{data['duration'].toFixed(2)}</span>)
                            </Typography>
                        </ListItem> : null }
                    </ListItem>
                ) : <Typography fontSize={10}>Fetching...</Typography>}
            </List>
        </Paper>
    )
}
