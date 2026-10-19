import { Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Box } from "@mui/system";
import Cookies from "js-cookie";
import TButton from "../loadable/Button";
import { SportsEsportsIcon } from "../loadable/Icon";
import '../styles/Wordle';


interface SoloState {
    word_length: number
    max_guesses: number
    guesses: { guess: string, result: string[] }[]
    is_finished: boolean
    won: boolean
    word: string | null
    bonus_guesses: number
}


export default function SoloWordle() {
    const [state, setState] = useState<SoloState | null>(null);
    const [guess, setGuess] = useState('');
    const [error, setError] = useState('');
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        fetch('/api/solo-wordle/', { credentials: 'include' })
            .then(response => response.json())
            .then(data => setState(data))
            .catch(() => setError('Failed to load the game.'));
    }, [])

    const length = state?.word_length ?? 5;

    const submitGuess = () => {
        if (!state || guess.length !== length || guess.includes(' ')) {
            return;
        }
        setError('');
        fetch('/api/solo-wordle/guess/', {
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
                    return;
                }
                setGuess('');
                setState(data);
                inputRefs.current[0]?.focus();
            })
            .catch(() => setError('Failed to submit guess.'));
    }

    const setLetter = (index: number, value: string) => {
        setError('');
        const letters = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (!letters) {
            return;
        }
        const chars = guess.padEnd(length, ' ').split('');
        letters.split('').forEach((letter, i) => {
            if (index + i < length) {
                chars[index + i] = letter;
            }
        });
        setGuess(chars.join('').trimEnd());
        inputRefs.current[Math.min(index + letters.length, length - 1)]?.focus();
    }

    const onBoxKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            submitGuess();
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            const chars = guess.padEnd(length, ' ').split('');
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

    const emptyRows = state && !state.is_finished
        ? Math.max(state.max_guesses - state.guesses.length - 1, 0) : 0;

    return <div className="WordleGame">
        <Box display="flex" alignItems="center" marginBottom={1}>
            <SportsEsportsIcon style={{ marginRight: 5 }}/>
            <Typography variant="h6" component="h2">SOLO WORDLE</Typography>
        </Box>
        <Typography variant="body2" marginBottom={2}>
            Guess the {length}-letter word in {state?.max_guesses ?? 6} tries.
            No points, but winning gives you an extra Team Wordle guess.
        </Typography>
        <Box marginBottom={2}>
            {state?.guesses.map((row, index) => (
                <div className="WordleRow" key={index}>
                    {row.guess.split('').map((letter, i) => (
                        <div key={i} className={`WordleTile ${row.result[i]}`}>{letter}</div>
                    ))}
                </div>
            ))}
            {state && !state.is_finished && (
                <div className="WordleSoloInput">
                    <div className="WordleRow WordleInput">
                        {Array.from({ length }).map((_, i) => (
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
                        disabled={guess.length !== length || guess.includes(' ')}
                        onClick={submitGuess}>Submit</TButton>
                </div>
            )}
            {Array.from({ length: emptyRows }).map((_, r) => (
                <div className="WordleRow" key={`empty-${r}`}>
                    {Array.from({ length }).map((_, i) => (
                        <div key={i} className="WordleTile empty"/>
                    ))}
                </div>
            ))}
        </Box>
        {state?.is_finished && (
            <Typography variant="body2" textAlign="center">
                {state.won
                    ? `You got it! You earned an extra Team Wordle guess (you have ${state.bonus_guesses}).`
                    : <>The word was <strong>{state.word}</strong>.</>}
                {' '}Come back tomorrow for a new word.
            </Typography>
        )}
        {error && (
            <Typography variant="body2" color="error" marginTop={1} textAlign="center">
                {error}
            </Typography>
        )}
    </div>
}
