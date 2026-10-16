import { Grid, Modal, Typography } from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/system";
import Cookies from "js-cookie";
import TButton from "../loadable/Button";
import { SportsEsportsIcon } from "../loadable/Icon";
import '../styles/Wordle';


interface WordleGuess {
    user: string
    is_me: boolean
    guess: string
    result: string[]
}

interface WordleState {
    active: boolean
    word_length: number
    guesses: WordleGuess[]
    has_guessed: boolean
    last_game: { word: string, winner: string | null } | null
    points: number
    leaderboard: { user: string, points: number }[]
}


const CONFETTI_COLORS = ['#538d4e', '#b59f3b', '#e91e63', '#2196f3', '#ff9800', '#9c27b0'];
const CELEBRATION_MS = 4500;


export default function Wordle() {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<WordleState | null>(null);
    const [guess, setGuess] = useState('');
    const [celebrating, setCelebrating] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [message, setMessage] = useState('');
    // Guess errors (e.g. not a valid word), shown below the answer boxes.
    const [error, setError] = useState('');
    // The round that was just finished by this user's guess, shown until closed.
    const [finished, setFinished] = useState<WordleState | null>(null);

    const loadState = () => {
        fetch('/api/wordle/', { credentials: 'include' })
            .then(response => response.json())
            .then(data => setState(data))
            .catch(() => setMessage('Failed to load the game.'));
    }

    useEffect(() => {
        if (open) {
            setMessage('');
            setError('');
            setFinished(null);
            setCelebrating(false);
            loadState();
        }
    }, [open])

    const submitGuess = () => {
        if (!state || guess.replace(/ /g, '').length !== state.word_length || guess.length !== state.word_length) {
            return;
        }
        setError('');
        setMessage('');
        fetch('/api/wordle/guess/', {
            credentials: 'include',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': Cookies.get('csrftoken') as any,
            },
            body: JSON.stringify({ guess }),
        })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) {
                    setError(data.error || 'Failed to submit guess.');
                    loadState();
                    return;
                }
                setGuess('');
                if (data.next) {
                    setFinished(data);
                    setCelebrating(!!data.won);
                    setState(data.next);
                    setMessage(data.won
                        ? 'You got it! +1 point. A new word comes tomorrow.'
                        : 'Round over. A new word comes tomorrow.');
                } else {
                    setState(data);
                    setMessage('Guess submitted.');
                }
            })
            .catch(() => setError('Failed to submit guess.'));
    }

    useEffect(() => {
        if (!celebrating) {
            return;
        }
        const timer = setTimeout(() => setCelebrating(false), CELEBRATION_MS);
        return () => clearTimeout(timer);
    }, [celebrating])

    const confetti = useMemo(() => Array.from({ length: 48 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2 + Math.random() * 1.8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
    })), [celebrating]);

    const setLetter = (index: number, value: string) => {
        setError('');
        const letters = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (!letters || !state) {
            return;
        }
        // Fill from this box onwards, so pasting a whole word works too.
        const chars = guess.padEnd(state.word_length, ' ').split('');
        letters.split('').forEach((letter, i) => {
            if (index + i < state.word_length) {
                chars[index + i] = letter;
            }
        });
        setGuess(chars.join('').trimEnd());
        inputRefs.current[Math.min(index + letters.length, state.word_length - 1)]?.focus();
    }

    const onBoxKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            submitGuess();
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            const chars = guess.padEnd(state?.word_length ?? 0, ' ').split('');
            const target = chars[index] !== ' ' ? index : Math.max(index - 1, 0);
            chars[target] = ' ';
            setGuess(chars.join('').trimEnd());
            inputRefs.current[target]?.focus();
        } else if (e.key === 'ArrowLeft') {
            inputRefs.current[Math.max(index - 1, 0)]?.focus();
        } else if (e.key === 'ArrowRight') {
            inputRefs.current[index + 1]?.focus();
        }
    }

    const renderRow = (row: WordleGuess, index: number) => (
        <div className={`WordleRow ${celebrating && finished && index === finished.guesses.length - 1 ? 'winner' : ''}`} key={index}>
            <div className="WordleName" title={row.user}>
                {row.is_me ? 'You' : row.user}
            </div>
            {row.guess.split('').map((letter, i) => (
                <div key={i} className={`WordleTile ${row.result[i]}`}>{letter}</div>
            ))}
        </div>
    )

    // Show the just-finished round's board until the next word is opened.
    const board = finished ? finished.guesses : state?.guesses ?? [];
    const lastGame = state?.last_game;

    return <div className="Wordle">
        <TButton
            onClick={() => setOpen(true)}
            className="WordleButton"
            aria-label="Wordle"
            title="Wordle"
            variant="outlined" size="large" color='secondary'>
            <SportsEsportsIcon/>
        </TButton>
        <Modal open={open} onClose={() => setOpen(false)}>
            <Box className='WordleModal'>
                {celebrating && (
                    <div className="WordleCelebration">
                        {confetti.map((c, i) => (
                            <span key={i} className="WordleConfetti" style={{
                                left: `${c.left}%`,
                                background: c.color,
                                animationDelay: `${c.delay}s`,
                                animationDuration: `${c.duration}s`,
                                transform: `rotate(${c.rotate}deg)`,
                            }}/>
                        ))}
                    </div>
                )}
                {celebrating && (
                    <div className="WordleWinBanner">🎉 You won! +1 point</div>
                )}
                <Grid container marginBottom={1}>
                    <Grid item xs={6} alignItems={'center'} display={'flex'}>
                        <SportsEsportsIcon style={{ marginRight: 5 }}/>
                        <Typography variant="h6" component="h2">TEAM WORDLE</Typography>
                    </Grid>
                    <Grid item xs={6} textAlign={'right'} alignSelf={'center'}>
                        <Typography variant="body2">
                            Your points: <strong>{state?.points ?? 0}</strong>
                        </Typography>
                    </Grid>
                </Grid>
                <Typography variant="body2" marginBottom={1}>
                    Guess the {state?.word_length || '7-9'}-letter word together. Each
                    person gets one guess per day until the word is solved; the first correct guess wins a point.
                </Typography>
                {lastGame && !finished && (
                    <Typography variant="body2" marginBottom={1}>
                        {state?.active ? 'Last word' : "Today's word"}: <strong>{lastGame.word}</strong>
                        {lastGame.winner ? ` - solved by ${lastGame.winner}` : ' - nobody solved it'}
                    </Typography>
                )}
                {finished && (
                    <Typography variant="body2" marginBottom={1}>
                        The word was <strong>{finished.last_game?.word}</strong>
                    </Typography>
                )}
                <Box marginBottom={2}>
                    {board.length === 0 && (
                        <Typography variant="body2" textAlign="center">
                            No guesses yet. Be the first!
                        </Typography>
                    )}
                    {board.map(renderRow)}
                </Box>
                {message && (
                    <Typography variant="body2" marginBottom={1}>{message}</Typography>
                )}
                {state && !state.has_guessed ? (
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        <div className="WordleRow WordleInput">
                            {Array.from({ length: state.word_length }).map((_, i) => (
                                <input
                                    key={i}
                                    ref={el => { inputRefs.current[i] = el; }}
                                    className="WordleTile empty"
                                    value={guess[i]?.trim() ?? ''}
                                    autoFocus={i === 0}
                                    autoComplete="off"
                                    onChange={e => setLetter(i, e.target.value)}
                                    onKeyDown={e => onBoxKeyDown(e, i)}
                                />
                            ))}
                        </div>
                        <TButton variant="contained"
                            disabled={guess.replace(/ /g, '').length !== state.word_length}
                            onClick={submitGuess}>Submit</TButton>
                    </Box>
                ) : (
                    state && <Typography variant="body2" textAlign="center">
                        {state.active
                            ? 'You already guessed today. Come back tomorrow to guess again if the word is still unsolved.'
                            : "Today's word is solved. A new word comes tomorrow."}
                    </Typography>
                )}
                {error && (
                    <Typography variant="body2" color="error" marginTop={1} textAlign="center">
                        {error}
                    </Typography>
                )}
                {state && state.leaderboard.length > 0 && (
                    <Box marginTop={2}>
                        <Typography variant="subtitle2">Leaderboard</Typography>
                        {state.leaderboard.map((entry, i) => (
                            <Typography variant="body2" key={i}>
                                {i + 1}. {entry.user} - {entry.points}
                            </Typography>
                        ))}
                    </Box>
                )}
            </Box>
        </Modal>
    </div>
}
