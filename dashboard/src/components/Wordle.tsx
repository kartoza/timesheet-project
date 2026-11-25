import { Grid, Typography } from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/system";
import Cookies from "js-cookie";
import TButton from "../loadable/Button";
import { RefreshIcon, SportsEsportsIcon } from "../loadable/Icon";
import '../styles/Wordle';


interface WordleGuess {
    user: string
    is_me: boolean
    guess: string
    result: string[]
}

interface WordleState {
    active: boolean
    clues_hidden: boolean
    length_hidden: boolean
    word_length: number
    guesses: WordleGuess[]
    has_guessed: boolean
    won_today: boolean
    bonus_guesses: number
    last_game: { word: string, winner: string | null } | null
    points: number
    points_won?: number
}


const CONFETTI_COLORS = ['#538d4e', '#b59f3b', '#e91e63', '#2196f3', '#ff9800', '#9c27b0'];
const CELEBRATION_MS = 4500;
// Shortest and longest word of the game, for players not told the length.
const MIN_LENGTH = 7;
const MAX_LENGTH = 9;


export default function Wordle() {
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
        loadState();
    }, [])

    const submitGuess = () => {
        if (!state) {
            return;
        }
        if (state.length_hidden) {
            // The length isn't known, any word of 7 to 9 letters can be sent.
            if (guess.length < MIN_LENGTH || guess.length > MAX_LENGTH) {
                return;
            }
        } else if (guess.replace(/ /g, '').length !== state.word_length || guess.length !== state.word_length) {
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
                    const nextInfo = data.next.active
                        ? 'A new word is ready for anyone who has not guessed today.'
                        : "Both of today's words are solved. New words come tomorrow.";
                    setMessage(data.won
                        ? `You got it! +${data.points_won} points. ${nextInfo}`
                        : `Round over. ${nextInfo}`);
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

    return <div className="WordleGame">
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
            <div className="WordleWinBanner">You won! +{finished?.points_won} points</div>
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
                <TButton size="small" startIcon={<RefreshIcon/>}
                    title="See if someone has submitted a new guess"
                    onClick={() => { setMessage(''); setError(''); loadState(); }}>
                    Refresh
                </TButton>
            </Grid>
        </Grid>
        <Typography variant="body2" marginBottom={1}>
            Guess the {state?.length_hidden ? '' : `${state?.word_length || '7-9'}-letter `}word together. There are
            two words a day: when one is solved, the next one starts. Each
            person gets one guess per day over both words; the first correct guess wins 2 points
            for a 7-letter word, 3 for 8 letters and 4 for 9 letters.
            {(state?.bonus_guesses ?? 0) > 0 && <> You have <strong>{state?.bonus_guesses}</strong> extra {state?.bonus_guesses === 1 ? 'guess' : 'guesses'} from Wordle.</>}
        </Typography>
        {lastGame && !finished && !state?.won_today && (
            <Typography variant="body2" marginBottom={1}>
                {state?.active ? 'Last word' : 'Last solved word'}: <strong>{lastGame.word}</strong>
                {lastGame.winner ? ` - solved by ${lastGame.winner}` : ' - nobody solved it'}
            </Typography>
        )}
        {finished && (
            <Typography variant="body2" marginBottom={1}>
                The word was <strong>{finished.last_game?.word}</strong>
            </Typography>
        )}
        <Box marginBottom={2}>
            {state?.length_hidden && !finished && (
                <Typography variant="body2" textAlign="center" marginBottom={1}>
                    You lead by a wide margin, so the length of the word is hidden from you.
                    A word of the wrong length still uses up your guess.
                </Typography>
            )}
            {state?.clues_hidden && !finished && (
                <Typography variant="body2" textAlign="center" marginBottom={1}>
                    You lead the leaderboard, so other players' clues are hidden from you.
                </Typography>
            )}
            {board.length === 0 && !state?.clues_hidden && (
                <Typography variant="body2" textAlign="center">
                    {state && !state.has_guessed ? 'No guesses yet. Be the first!' : 'No guesses yet.'}
                </Typography>
            )}
            {board.map(renderRow)}
        </Box>
        {message && (
            <Typography variant="body2" marginBottom={1}>{message}</Typography>
        )}
        {state && !state.has_guessed && state.length_hidden ? (
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <input
                    className="WordleFreeInput"
                    value={guess.trim()}
                    maxLength={MAX_LENGTH}
                    placeholder={`A word of ${MIN_LENGTH} to ${MAX_LENGTH} letters`}
                    autoFocus
                    autoComplete="off"
                    onChange={e => {
                        setError('');
                        setGuess(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase());
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') submitGuess(); }}
                />
                <TButton variant="contained" className="WordleFreeSubmit"
                    disabled={guess.length < MIN_LENGTH || guess.length > MAX_LENGTH}
                    onClick={submitGuess}>Submit</TButton>
            </Box>
        ) : state && !state.has_guessed ? (
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
                    ? state.won_today
                        ? 'You solved a word today, well done! Come back tomorrow.'
                        : 'You already guessed today. Come back tomorrow to guess again if the word is still unsolved.'
                    : "Today's two words are solved. New words come tomorrow."}
            </Typography>
        )}
        {error && (
            <Typography variant="body2" color="error" marginTop={1} textAlign="center">
                {error}
            </Typography>
        )}
    </div>
}
