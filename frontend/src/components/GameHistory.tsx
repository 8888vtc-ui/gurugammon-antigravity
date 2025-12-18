import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ChevronRight, Trophy, Calendar, Clock, ChevronDown, ChevronUp, Play, RotateCcw } from 'lucide-react';
import { api } from '../utils/api';

interface GameHistoryItem {
    id: string;
    opponent: {
        id: string;
        name: string;
        avatar?: string;
    };
    result: 'WIN' | 'LOSS' | 'DRAW';
    score: string;
    pointsWon: number;
    gameType: 'single' | 'gammon' | 'backgammon';
    cubeValue: number;
    date: string;
    duration: number; // in minutes
    matchId?: string;
    matchScore?: { white: number; black: number };
    playerColor: 'white' | 'black';
}

interface GameHistoryProps {
    userId?: string;
    limit?: number;
    showLoadMore?: boolean;
    compact?: boolean;
    onReplayGame?: (gameId: string) => void;
    onRematch?: (opponentId: string) => void;
}

const resultColors = {
    WIN: 'text-green-400 bg-green-900/30',
    LOSS: 'text-red-400 bg-red-900/30',
    DRAW: 'text-gray-400 bg-gray-900/30'
};

const gameTypeLabels = {
    single: { text: 'Single', color: 'text-blue-400' },
    gammon: { text: 'Gammon', color: 'text-orange-400' },
    backgammon: { text: 'Backgammon', color: 'text-red-400' }
};

const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
};

export const GameHistory: React.FC<GameHistoryProps> = ({
    userId,
    limit = 10,
    showLoadMore = true,
    compact = false,
    onReplayGame,
    onRematch
}) => {
    const [games, setGames] = useState<GameHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [expandedGame, setExpandedGame] = useState<string | null>(null);

    useEffect(() => {
        fetchGames();
    }, [userId, page]);

    const fetchGames = async () => {
        setIsLoading(true);
        try {
            const endpoint = userId
                ? `/api/users/${userId}/games?page=${page}&limit=${limit}`
                : `/api/games/history?page=${page}&limit=${limit}`;

            const { data } = await api.get(endpoint);

            const newGames = data.games || data || [];
            setGames(prev => page === 1 ? newGames : [...prev, ...newGames]);
            setHasMore(newGames.length === limit);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch game history:', err);
            setError('Failed to load game history');
            // Use mock data for demo
            setGames(generateMockGames(limit));
        } finally {
            setIsLoading(false);
        }
    };

    const loadMore = () => {
        if (!isLoading && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    const calculateStats = () => {
        const wins = games.filter(g => g.result === 'WIN').length;
        const losses = games.filter(g => g.result === 'LOSS').length;
        const draws = games.filter(g => g.result === 'DRAW').length;
        const totalPoints = games.reduce((sum, g) => sum + (g.result === 'WIN' ? g.pointsWon : -g.pointsWon), 0);

        return { wins, losses, draws, totalPoints };
    };

    const stats = calculateStats();

    if (isLoading && games.length === 0) {
        return (
            <div className="bg-[#1e1e1e] rounded-xl border border-gray-800 p-6">
                <div className="flex items-center gap-2 text-gray-400">
                    <History className="w-5 h-5 animate-spin" />
                    Loading history...
                </div>
            </div>
        );
    }

    if (error && games.length === 0) {
        return (
            <div className="bg-[#1e1e1e] rounded-xl border border-gray-800 p-6">
                <div className="text-red-400 text-center">{error}</div>
            </div>
        );
    }

    return (
        <div className="bg-[#1e1e1e] rounded-xl border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-guru-gold" />
                    Game History
                </h3>

                {/* Quick Stats */}
                {!compact && (
                    <div className="flex gap-4">
                        <div className="text-center">
                            <span className="text-green-400 font-bold">{stats.wins}</span>
                            <span className="text-gray-500 text-xs block">Wins</span>
                        </div>
                        <div className="text-center">
                            <span className="text-red-400 font-bold">{stats.losses}</span>
                            <span className="text-gray-500 text-xs block">Losses</span>
                        </div>
                        <div className="text-center">
                            <span className={`font-bold ${stats.totalPoints >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stats.totalPoints > 0 ? '+' : ''}{stats.totalPoints}
                            </span>
                            <span className="text-gray-500 text-xs block">Points</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Games List */}
            <div className="divide-y divide-gray-800">
                <AnimatePresence>
                    {games.map((game, index) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 hover:bg-[#252525] transition-colors"
                        >
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Result Badge */}
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${resultColors[game.result]}`}>
                                        {game.result}
                                    </div>

                                    {/* Opponent */}
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${game.playerColor === 'white' ? 'bg-white' : 'bg-red-800'}`} />
                                        <span className="text-white font-medium">vs {game.opponent.name}</span>
                                    </div>

                                    {/* Score */}
                                    <span className="text-gray-400 text-sm">{game.score}</span>

                                    {/* Game Type */}
                                    {game.gameType !== 'single' && (
                                        <span className={`text-xs font-bold ${gameTypeLabels[game.gameType].color}`}>
                                            {gameTypeLabels[game.gameType].text}
                                        </span>
                                    )}

                                    {/* Cube */}
                                    {game.cubeValue > 1 && (
                                        <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">
                                            ×{game.cubeValue}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Points */}
                                    <span className={`font-bold ${game.result === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                                        {game.result === 'WIN' ? '+' : '-'}{game.pointsWon}
                                    </span>

                                    {/* Date */}
                                    <span className="text-gray-500 text-sm flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(game.date)}
                                    </span>

                                    {/* Expand */}
                                    {expandedGame === game.id ? (
                                        <ChevronUp className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                                {expandedGame === game.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-4 pt-4 border-t border-gray-800"
                                    >
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <span className="text-gray-500 text-xs block">Duration</span>
                                                <span className="text-white flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDuration(game.duration)}
                                                </span>
                                            </div>
                                            {game.matchScore && (
                                                <div>
                                                    <span className="text-gray-500 text-xs block">Match Score</span>
                                                    <span className="text-white">
                                                        {game.matchScore.white} - {game.matchScore.black}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-gray-500 text-xs block">Points</span>
                                                <span className="text-white">
                                                    {game.pointsWon} × {game.cubeValue}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {onReplayGame && (
                                                <button
                                                    onClick={() => onReplayGame(game.id)}
                                                    className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 px-3 py-1 bg-blue-900/30 rounded-lg"
                                                >
                                                    <Play className="w-3 h-3" />
                                                    Replay
                                                </button>
                                            )}
                                            {onRematch && (
                                                <button
                                                    onClick={() => onRematch(game.opponent.id)}
                                                    className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300 px-3 py-1 bg-green-900/30 rounded-lg"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    Rematch
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Load More */}
            {showLoadMore && hasMore && (
                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={loadMore}
                        disabled={isLoading}
                        className="w-full py-2 text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <History className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                Load More <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Empty State */}
            {games.length === 0 && !isLoading && (
                <div className="p-8 text-center text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No games played yet</p>
                    <p className="text-sm mt-1">Start playing to see your history!</p>
                </div>
            )}
        </div>
    );
};

// Mock data generator for demo
function generateMockGames(count: number): GameHistoryItem[] {
    const opponents = ['Magnus', 'GrandMaster99', 'ProPlayer', 'BackgammonKing', 'DiceRoller'];

    return Array.from({ length: count }, (_, i) => ({
        id: `game_${Date.now()}_${i}`,
        opponent: {
            id: `opp_${i}`,
            name: opponents[Math.floor(Math.random() * opponents.length)]
        },
        result: Math.random() > 0.4 ? 'WIN' : 'LOSS' as 'WIN' | 'LOSS',
        score: `${Math.floor(Math.random() * 7) + 1} - ${Math.floor(Math.random() * 7) + 1}`,
        pointsWon: Math.floor(Math.random() * 4) + 1,
        gameType: ['single', 'gammon', 'backgammon'][Math.floor(Math.random() * 3)] as 'single' | 'gammon' | 'backgammon',
        cubeValue: [1, 2, 4, 8][Math.floor(Math.random() * 4)],
        date: new Date(Date.now() - i * 86400000).toISOString(),
        duration: Math.floor(Math.random() * 60) + 10,
        playerColor: Math.random() > 0.5 ? 'white' : 'black' as 'white' | 'black'
    }));
}

export default GameHistory;
