import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Trophy, User, LogOut, Users, RefreshCw, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import { Player } from '../types/game';

interface LobbyGame {
    id: string;
    status: 'waiting' | 'playing' | 'completed';
    gameMode: 'AI_VS_PLAYER' | 'PLAYER_VS_PLAYER';
    stake: number;
    whitePlayer: Player | null;
    blackPlayer: Player | null;
    matchLength: number | null;
    createdAt: Date;
}

export const Lobby: React.FC = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState<LobbyGame[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const { lastMessage } = useWebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3001');

    const fetchGames = useCallback(async () => {
        try {
            const { data } = await api.get('/games/available');
            setGames(Array.isArray(data) ? data : data.games || []);
        } catch (err) {
            console.error('Failed to fetch games:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGames();
        const interval = setInterval(fetchGames, 5000);

        // Simulate online count
        setOnlineCount(Math.floor(Math.random() * 50) + 10);

        return () => clearInterval(interval);
    }, [fetchGames]);

    // Handle WebSocket updates for lobby
    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === 'gameCreated' || lastMessage.type === 'gameJoined') {
                fetchGames();
            }
            if (lastMessage.type === 'onlineCount' && typeof lastMessage.count === 'number') {
                setOnlineCount(lastMessage.count);
            }
        }
    }, [lastMessage, fetchGames]);

    const createGame = async (mode: 'AI_VS_PLAYER' | 'PLAYER_VS_PLAYER') => {
        setIsCreating(true);
        try {
            const { data } = await api.post('/games', { mode, stake: 100 });
            navigate(`/game/${data.id}`);
        } catch (err) {
            console.error('Failed to create game:', err);
            alert('Failed to create game. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const joinGame = async (gameId: string) => {
        try {
            await api.post(`/games/${gameId}/join`);
            navigate(`/game/${gameId}`);
        } catch (err) {
            console.error('Failed to join game:', err);
            navigate(`/game/${gameId}`); // Go as spectator
        }
    };

    const getGameStatusBadge = (game: LobbyGame) => {
        if (game.status === 'waiting') {
            return <span className="px-2 py-1 text-xs font-medium bg-yellow-900/50 text-yellow-300 rounded">Waiting</span>;
        }
        if (game.status === 'playing') {
            return <span className="px-2 py-1 text-xs font-medium bg-green-900/50 text-green-300 rounded flex items-center gap-1"><Zap className="w-3 h-3" />Live</span>;
        }
        return null;
    };

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    return (
        <div className="min-h-screen bg-guru-bg text-white">
            <nav className="border-b border-gray-800 bg-[#1a1a1a] p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <Link to="/lobby" className="text-2xl font-bold text-guru-gold">GuruGammon</Link>
                    <div className="flex items-center gap-6">
                        {/* Online indicator */}
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span>{onlineCount} online</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-400" />
                            <span>{user.username || 'Guest'}</span>
                        </div>
                        <Link to="/profile" className="text-gray-400 hover:text-white">
                            <User className="w-5 h-5" />
                        </Link>
                        <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="text-gray-400 hover:text-white">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Actions */}
                    <div className="space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => createGame('AI_VS_PLAYER')}
                            disabled={isCreating}
                            className="w-full bg-gradient-to-r from-guru-gold to-yellow-600 p-6 rounded-xl font-bold text-black text-lg shadow-lg flex items-center justify-between disabled:opacity-50"
                        >
                            <div className="flex flex-col items-start">
                                <span>Play vs AI Coach</span>
                                <span className="text-xs font-normal opacity-70">Practice with GuruBot AI</span>
                            </div>
                            {isCreating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => createGame('PLAYER_VS_PLAYER')}
                            disabled={isCreating}
                            className="w-full bg-[#2d2d2d] border border-gray-700 p-6 rounded-xl font-bold text-white text-lg hover:bg-[#3d3d3d] transition-colors flex items-center justify-between disabled:opacity-50"
                        >
                            <div className="flex flex-col items-start">
                                <span>Create PvP Game</span>
                                <span className="text-xs font-normal text-gray-400">Challenge a friend</span>
                            </div>
                            <Users className="w-6 h-6" />
                        </motion.button>

                        <Link to="/tournaments">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="w-full mt-4 bg-[#1e1e1e] border border-guru-gold/30 p-6 rounded-xl font-bold text-guru-gold text-lg hover:bg-[#252525] transition-colors flex items-center justify-between"
                            >
                                <div className="flex flex-col items-start">
                                    <span>Tournaments</span>
                                    <span className="text-xs font-normal text-guru-gold/60">Compete for prizes</span>
                                </div>
                                <Trophy className="w-6 h-6" />
                            </motion.div>
                        </Link>

                        {/* Quick Stats */}
                        <div className="bg-[#1e1e1e] rounded-xl border border-gray-800 p-4 mt-6">
                            <h3 className="text-sm font-medium text-gray-400 mb-3">Your Stats</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white">{user.points || 1500}</p>
                                    <p className="text-xs text-gray-500">ELO Rating</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-400">{user.wins || 0}</p>
                                    <p className="text-xs text-gray-500">Wins</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Game List */}
                    <div className="md:col-span-2 bg-[#1e1e1e] rounded-xl border border-gray-800 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Live Games
                            </h2>
                            <button
                                onClick={fetchGames}
                                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#333] transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {isLoading ? (
                                    <div className="text-center text-gray-500 py-10">
                                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                                        Loading games...
                                    </div>
                                ) : games.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center text-gray-500 py-10"
                                    >
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>No active games found.</p>
                                        <p className="text-sm mt-1">Create one to get started!</p>
                                    </motion.div>
                                ) : (
                                    games.map((game, index) => (
                                        <motion.div
                                            key={game.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-[#121212] p-4 rounded-lg flex justify-between items-center border border-gray-800 hover:border-gray-600 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white">{game.whitePlayer?.name || 'Waiting...'}</span>
                                                        <span className="text-gray-500">vs</span>
                                                        <span className="font-bold text-white">{game.blackPlayer?.name || 'Waiting...'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {getGameStatusBadge(game)}
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTimeAgo(game.createdAt)}
                                                        </span>
                                                        {game.stake > 0 && (
                                                            <span className="text-xs text-yellow-400">{game.stake} pts</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => joinGame(game.id)}
                                                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${game.status === 'waiting'
                                                    ? 'bg-green-600 hover:bg-green-500 text-white'
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                                    }`}
                                            >
                                                {game.status === 'waiting' ? 'Join' : 'Watch'}
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
