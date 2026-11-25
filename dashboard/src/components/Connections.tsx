import { Grid, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Box } from "@mui/system";
import Cookies from "js-cookie";
import TButton from "../loadable/Button";
import { RefreshIcon, SportsEsportsIcon } from "../loadable/Icon";
import '../styles/Connections';


interface SolvedGroup {
    level: number
    category: string
    words: string[]
    found_by: string
    is_me: boolean
}

interface ConnectionsState {
    active: boolean
    unavailable: boolean
    words: string[]
    solved: SolvedGroup[]
    attempts: { user: string, is_me: boolean, words: string[], one_away: boolean }[]
    has_played: boolean
    points: number
}

const GROUP_SIZE = 4;


export default function Connections() {
    const [state, setState] = useState<ConnectionsState | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    // Category of the group this user just found, to highlight it.
    const [freshGroup, setFreshGroup] = useState('');

    const loadState = () => {
        fetch('/api/connections/', { credentials: 'include' })
            .then(response => response.json())
            .then(data => setState(data))
            .catch(() => setError('Failed to load the game.'));
    }

    useEffect(() => {
        loadState();
    }, [])

    const canPick = !!state && state.active && !state.has_played;

    const toggleWord = (word: string) => {
        if (!canPick) {
            return;
        }
        setError('');
        setSelected(current => current.includes(word)
            ? current.filter(w => w !== word)
            : current.length < GROUP_SIZE ? [...current, word] : current);
    }

    const submitPick = () => {
        if (!canPick || selected.length !== GROUP_SIZE) {
            return;
        }
        setError('');
        setMessage('');
        fetch('/api/connections/pick/', {
            credentials: 'include',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': Cookies.get('csrftoken') as any,
            },
            body: JSON.stringify({ words: selected }),
        })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) {
                    setError(data.error || 'Failed to submit your pick.');
                    loadState();
                    return;
                }
                setSelected([]);
                setFreshGroup(data.result === 'correct' ? data.group : '');
                setState(data.next ?? data);
                if (data.result === 'correct') {
                    setMessage(`🎉 Correct! You found "${data.group}" (+1 point).`);
                } else if (data.result === 'one_away') {
                    setMessage('So close, one word away! Come back tomorrow to try again.');
                } else {
                    setMessage('Not a group. Come back tomorrow to try again.');
                }
            })
            .catch(() => setError('Failed to submit your pick.'));
    }

    return <div className="ConnectionsGame">
        <Grid container marginBottom={1}>
            <Grid item xs={6} alignItems={'center'} display={'flex'}>
                <SportsEsportsIcon style={{ marginRight: 5 }}/>
                <Typography variant="h6" component="h2">TEAM CONNECTIONS</Typography>
            </Grid>
            <Grid item xs={6} textAlign={'right'} alignSelf={'center'}>
                <Typography variant="body2">
                    Your points: <strong>{state?.points ?? 0}</strong>
                </Typography>
                <TButton size="small" startIcon={<RefreshIcon/>}
                    title="See if someone has submitted a new guess"
                    onClick={() => { setMessage(''); setError(''); loadState(); }}>
                    Refresh
                </TButton>
            </Grid>
        </Grid>
        <Typography variant="body2" marginBottom={1}>
            Find groups of four words that share something in common. Each person
            gets one pick per day until the puzzle is solved, and every group
            you find earns a point.
        </Typography>
        {message && (
            <div className="GameWinBanner" style={{ fontSize: 15 }}>{message}</div>
        )}
        {state?.solved.map(group => (
            <div key={group.level}
                className={`ConnectionsGroup level-${group.level} ${group.category === freshGroup ? 'fresh' : ''}`}>
                <div className="ConnectionsCategory">{group.category}</div>
                <div className="ConnectionsWords">{group.words.join(', ')}</div>
                <div className="ConnectionsFoundBy">
                    found by {group.is_me ? 'you' : group.found_by}
                </div>
            </div>
        ))}
        {state && state.words.length > 0 && (
            <div className="ConnectionsGrid">
                {state.words.map(word => (
                    <button key={word}
                        className={`ConnectionsWord ${selected.includes(word) ? 'selected' : ''}`}
                        disabled={!canPick}
                        onClick={() => toggleWord(word)}>
                        {word}
                    </button>
                ))}
            </div>
        )}
        {canPick ? (
            <Box display="flex" justifyContent="center" gap={1}>
                <TButton variant="outlined"
                    disabled={selected.length === 0}
                    onClick={() => setSelected([])}>Clear</TButton>
                <TButton variant="contained"
                    disabled={selected.length !== GROUP_SIZE}
                    onClick={submitPick}>Submit</TButton>
            </Box>
        ) : (
            state && <Typography variant="body2" textAlign="center">
                {state.unavailable
                    ? 'There is no puzzle available right now. Check back soon.'
                    : state.active
                        ? 'You already played today. Come back tomorrow to pick again if the puzzle is still unsolved.'
                        : "Today's puzzle is solved. A new one comes tomorrow."}
            </Typography>
        )}
        {error && (
            <Typography variant="body2" color="error" marginTop={1} textAlign="center">
                {error}
            </Typography>
        )}
        {state && state.attempts.length > 0 && (
            <Box marginTop={2}>
                <Typography variant="subtitle2">Missed picks</Typography>
                {state.attempts.map((attempt, i) => (
                    <Typography variant="body2" key={i} sx={{ fontSize: 12 }}>
                        {attempt.is_me ? 'You' : attempt.user}: {attempt.words.join(', ')}
                        {attempt.one_away ? ' (one away)' : ''}
                    </Typography>
                ))}
            </Box>
        )}
    </div>
}
