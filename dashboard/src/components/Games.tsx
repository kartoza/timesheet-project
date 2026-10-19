import { Chip, Modal, Typography } from "@mui/material";
import React, { Suspense, useEffect, useState } from "react";
import { Box } from "@mui/system";
import TButton from "../loadable/Button";
import { SportsEsportsIcon } from "../loadable/Icon";
import '../styles/Games';
import '../styles/Wordle';

const Wordle = React.lazy(() => import('./Wordle'));
const SoloWordle = React.lazy(() => import('./SoloWordle'));
const Connections = React.lazy(() => import('./Connections'));

type GameKey = 'wordle' | 'solo_wordle' | 'connections';

interface LeaderboardEntry {
    rank: number
    user: string
    points: number
    is_me: boolean
}

interface GameStatus {
    key: GameKey
    title: string
    description: string
    played_today: boolean
    bonus_guesses?: number
    solved: boolean
    unavailable: boolean
}

const GAME_COMPONENTS: { [key in GameKey]: React.LazyExoticComponent<() => JSX.Element> } = {
    wordle: Wordle,
    solo_wordle: SoloWordle,
    connections: Connections,
};


export default function Games() {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<GameKey | null>(null);
    const [games, setGames] = useState<GameStatus[]>([]);
    const [points, setPoints] = useState(0);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [rank, setRank] = useState<number | null>(null);
    const [error, setError] = useState('');

    const loadStatus = () => {
        fetch('/api/games/', { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                setGames(data.games);
                setPoints(data.points);
                setLeaderboard(data.leaderboard);
                setRank(data.rank);
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
        if (game.bonus_guesses) {
            return <Chip size="small" color="warning"
                label={`${game.bonus_guesses} extra ${game.bonus_guesses === 1 ? 'guess' : 'guesses'}`} />;
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
                        <div className="GamesLeaderboard">
                            <div className="GamesLeaderboardTitle">
                                <Typography variant="subtitle2">Leaderboard</Typography>
                                {rank && <Typography variant="body2">
                                    Your rank: <strong>#{rank}</strong>
                                </Typography>}
                            </div>
                            {leaderboard.length === 0 && (
                                <Typography variant="body2" className="GamesLeaderboardEmpty">
                                    No points yet. Win a game to get on the board.
                                </Typography>
                            )}
                            {leaderboard.map((entry, i) => (
                                <div key={i}
                                    className={`GamesLeaderboardRow ${entry.is_me ? 'me' : ''}`}>
                                    <span className={`GamesRank rank-${entry.rank}`}>{entry.rank}</span>
                                    <span className="GamesLeaderboardName">
                                        {entry.user}{entry.is_me ? ' (you)' : ''}
                                    </span>
                                    <span className="GamesLeaderboardPoints">
                                        {entry.points} {entry.points === 1 ? 'pt' : 'pts'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Box>
        </Modal>
    </div>
}
