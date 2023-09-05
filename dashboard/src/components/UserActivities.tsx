import {Paper, Typography, ListItem, List} from "@mui/material";
import { useEffect, useState } from "react";
import '../styles/UserActivties.scss'
import Chip from "@mui/material/Chip";

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
                            <Typography fontSize={12} align={'left'}>{data['first_name']}</Typography>
                            &nbsp;<Chip size={'small'} label={data['clock']} style={{ fontSize: 11}} />
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
