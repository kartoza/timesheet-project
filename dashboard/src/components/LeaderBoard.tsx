import { Paper, Typography, Box, ListItem, List, Divider } from "@mui/material";
import { useEffect, useState } from "react";
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RemoveIcon from '@mui/icons-material/Remove';


function LeaderboardStatus(props: any) {
    if (props.status === 'up') {
        return <KeyboardArrowUpIcon sx={{ color: 'green' }}/>
    } else if (props.status === 'down') {
        return <KeyboardArrowDownIcon sx={{ color: 'red' }}/>
    } else if (props.status === 'upup') {
        return <KeyboardDoubleArrowUpIcon sx={{ color: 'green' }}/>
    } else if (props.status === 'downdown') {
        return <KeyboardDoubleArrowDownIcon sx={{ color: 'red' }}/>
    }
    return <RemoveIcon/>
}

export default function LeaderBoard(props: any) {

    const [leaderboardData, setLeaderboardData] = useState<any>(null)

    useEffect(() => {
        fetch('/api/user-leaderboard/').then(
            result => result.json()
        ).then(data => (
            setLeaderboardData(data)
        ))
    }, [])

    return (
        <Paper className={'leaderboard-container'}>
            <Typography fontSize={13}>Leaderboard</Typography>
            <List>
                { leaderboardData ? leaderboardData['leaderboard'].map(
                    (data: any, index) => <ListItem key={ 'leaderboard-' + index } style={{ display: 'flex', paddingTop: 2, paddingLeft: 4, paddingBottom: 2 }} divider>
                        <Typography fontSize={9} style={{ paddingRight: 6 }}>
                            <LeaderboardStatus status={data['status']} />
                        </Typography>
                        <Typography fontSize={9} align={'left'}>{data['name'].split(' ')[0]}</Typography>
                        { index == 0 ? <EmojiEventsIcon style={{ color: 'color(srgb 0.906 0.7592 0.2892)' }}/> : null }
                        <Typography fontSize={9} style={{marginLeft: 'auto'}}>{data['hours'].toFixed(2)}</Typography>
                    </ListItem>
                ) : <Typography fontSize={10}>Fetching...</Typography>}
            </List>
        </Paper>
    )
}
