import { Chip, Modal, Typography } from "@mui/material";
import React, { Suspense, useEffect, useState } from "react";
import { Box } from "@mui/system";
import TButton from "../loadable/Button";
import { SportsEsportsIcon } from "../loadable/Icon";
import '../styles/Games';
import '../styles/Wordle';

const Wordle = React.lazy(() => import('./Wordle'));
const Connections = React.lazy(() => import('./Connections'));

type GameKey = 'wordle' | 'connections';

interface GameStatus {
    key: GameKey
    title: string
    description: string
    played_today: boolean
    solved: boolean
    unavailable: boolean
}

const GAME_COMPONENTS: { [key in GameKey]: React.LazyExoticComponent<() => JSX.Element> } = {
    wordle: Wordle,
    connections: Connections,
};


export default function Games() {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<GameKey | null>(null);
    const [games, setGames] = useState<GameStatus[]>([]);
    const [points, setPoints] = useState(0);
    const [leaderboard, setLeaderboard] = useState<{ user: string, points: number }[]>([]);
    const [error, setError] = useState('');

    const loadStatus = () => {
        fetch('/api/games/', { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                setGames(data.games);
                setPoints(data.points);
                setLeaderboard(data.leaderboard);
            })
            .catch(() => setError('Failed to load the games.'));
    }

    // Reload the played/not played state whenever the menu is shown.
    useEffect(() => {
        if (open && view === null) {
            setError('');
            loadStatus();
        }
    }, [open, view])

    const statusChip = (game: GameStatus) => {
        if (game.unavailable) {
            return <Chip size="small" variant="outlined" label="Coming soon" />;
        }
        if (game.solved) {
            return <Chip size="small" color="success" label="Solved today" />;
        }
        if (game.played_today) {
            return <Chip size="small" color="success" label="✓ Played today" />;
        }
        return <Chip size="small" variant="outlined" label="Not played yet" />;
    }

    const GameComponent = view ? GAME_COMPONENTS[view] : null;

    return <div className="Games">
        <TButton
            onClick={() => { setView(null); setOpen(true); }}
            className="GamesButton"
            aria-label="Games"
            title="Games"
            variant="outlined" size="large" color='secondary'>
            <SportsEsportsIcon/>
        </TButton>
        <Modal open={open} onClose={() => setOpen(false)}>
            <Box className='GamesModal'>
                {GameComponent ? (
                    <>
                        <Box marginBottom={1}>
                            <TButton size="small" onClick={() => setView(null)}>← All games</TButton>
                        </Box>
                        <Suspense fallback={<div></div>}>
                            <GameComponent/>
                        </Suspense>
                    </>
                ) : (
                    <>
                        <div className="GamesHeader">
                            <Box display="flex" alignItems="center">
                                <SportsEsportsIcon style={{ marginRight: 5 }}/>
                                <Typography variant="h6" component="h2">TEAM GAMES</Typography>
                            </Box>
                            <Typography variant="body2">
                                Your points: <strong>{points}</strong>
                            </Typography>
                        </div>
                        {games.map(game => (
                            <button key={game.key} className="GameCard"
                                onClick={() => setView(game.key)}>
                                <div>
                                    <div className="GameCardTitle">{game.title}</div>
                                    <div className="GameCardDescription">{game.description}</div>
                                </div>
                                {statusChip(game)}
                            </button>
                        ))}
                        {error && (
                            <Typography variant="body2" color="error">{error}</Typography>
                        )}
                        {leaderboard.length > 0 && (
                            <Box marginTop={2}>
                                <Typography variant="subtitle2">Leaderboard</Typography>
                                {leaderboard.map((entry, i) => (
                                    <Typography variant="body2" key={i}>
                                        {i + 1}. {entry.user} - {entry.points}
                                    </Typography>
                                ))}
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Modal>
    </div>
}
