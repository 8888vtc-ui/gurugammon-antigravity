import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award, RefreshCw } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../utils/api';

interface LeaderboardEntry {
    id: string;
    rank: number;
    previousRank?: number;
    username: string;
    avatar?: string;
    country?: string;
    elo: number;
    winrate: number;
    gamesPlayed: number;
    gamesWon: number;
    streak?: number;
    isOnline?: boolean;
}

interface LeaderboardProps {
    type?: 'global' | 'country' | 'friends';
    countryCode?: string;
    limit?: number;
    showCurrentUser?: boolean;
    currentUserId?: string;
    sortBy?: 'elo' | 'winrate' | 'games';
    enableRealtime?: boolean;
}

const getRankIcon = (rank: number) => {
    switch (rank) {
        case 1:
            return <Crown className="w-5 h-5 text-yellow-400" />;
        case 2:
            return <Medal className="w-5 h-5 text-gray-300" />;
        case 3:
            return <Award className="w-5 h-5 text-amber-600" />;
        default:
            return <span className="text-gray-500 font-mono w-5 text-center">{rank}</span>;
    }
};

const getRankChange = (current: number, previous?: number) => {
    if (!previous || current === previous) {
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
    if (current < previous) {
        return (
            <span className="flex items-center text-green-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                +{previous - current}
            </span>
        );
    }
    return (
        <span className="flex items-center text-red-400 text-xs">
            <TrendingDown className="w-3 h-3" />
            -{current - previous}
        </span>
    );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
    type = 'global',
    countryCode,
    limit = 20,
    showCurrentUser = true,
    currentUserId,
    sortBy = 'elo',
    enableRealtime = true
}) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSort, setSelectedSort] = useState(sortBy);
    const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);

    // WebSocket for real-time updates
    const { lastMessage, isConnected } = useWebSocket(
        import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
        { maxReconnectAttempts: 3 }
    );

    useEffect(() => {
        fetchLeaderboard();
    }, [type, countryCode, selectedSort, limit]);

    // Handle real-time updates
    useEffect(() => {
        if (enableRealtime && lastMessage?.type === 'LEADERBOARD_UPDATE') {
            const update = lastMessage.payload as { scope?: { type?: string; sort?: string }; entries?: LeaderboardEntry[] } | undefined;
            if (update?.scope?.type === type && update?.scope?.sort === selectedSort) {
                setEntries(update.entries || []);
            }
        }
    }, [lastMessage, type, selectedSort, enableRealtime]);

    const fetchLeaderboard = async () => {
        setIsLoading(true);
        try {
            let endpoint = `/api/leaderboards/${type}?sort=${selectedSort}&perPage=${limit}`;
            if (type === 'country' && countryCode) {
                endpoint = `/api/leaderboards/country/${countryCode}?sort=${selectedSort}&perPage=${limit}`;
            }

            const { data } = await api.get(endpoint);
            setEntries(data.data || data.entries || data || []);

            // Find current user
            if (showCurrentUser && currentUserId) {
                const user = (data.data || data.entries || data || []).find((e: LeaderboardEntry) => e.id === currentUserId);
                setUserEntry(user || null);
            }
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
            // Use mock data
            setEntries(generateMockLeaderboard(limit));
        } finally {
            setIsLoading(false);
        }
    };

    const sortOptions = [
        { value: 'elo', label: 'ELO Rating' },
        { value: 'winrate', label: 'Win Rate' },
        { value: 'games', label: 'Games Played' }
    ];

    return (
        <div className="bg-[#1e1e1e] rounded-xl border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        {type === 'global' ? 'Global Leaderboard' :
                            type === 'country' ? `${countryCode} Leaderboard` :
                                'Friends Leaderboard'}
                    </h3>

                    <div className="flex items-center gap-2">
                        {/* Real-time indicator */}
                        {enableRealtime && (
                            <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                                {isConnected ? 'Live' : 'Offline'}
                            </div>
                        )}

                        {/* Refresh */}
                        <button
                            onClick={fetchLeaderboard}
                            disabled={isLoading}
                            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#333]"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Sort Options */}
                <div className="flex gap-2">
                    {sortOptions.map(option => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedSort(option.value as 'elo' | 'winrate' | 'games')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedSort === option.value
                                ? 'bg-guru-gold text-black'
                                : 'bg-[#333] text-gray-400 hover:text-white'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="divide-y divide-gray-800">
                <AnimatePresence>
                    {entries.map((entry, index) => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`p-4 flex items-center gap-4 hover:bg-[#252525] transition-colors ${entry.id === currentUserId ? 'bg-guru-gold/10 border-l-2 border-guru-gold' : ''
                                }`}
                        >
                            {/* Rank */}
                            <div className="w-8 flex justify-center">
                                {getRankIcon(entry.rank)}
                            </div>

                            {/* Rank Change */}
                            <div className="w-8">
                                {getRankChange(entry.rank, entry.previousRank)}
                            </div>

                            {/* Player Info */}
                            <div className="flex-1 flex items-center gap-3">
                                <div className="relative">
                                    <img
                                        src={entry.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`}
                                        alt={entry.username}
                                        className="w-10 h-10 rounded-full bg-[#333]"
                                    />
                                    {entry.isOnline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1e1e1e]" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{entry.username}</span>
                                        {entry.country && (
                                            <span className="text-xs text-gray-500">{entry.country}</span>
                                        )}
                                    </div>
                                    {entry.streak && entry.streak > 3 && (
                                        <span className="text-xs text-orange-400">🔥 {entry.streak} win streak</span>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-6 text-right">
                                <div>
                                    <span className={`font-bold ${selectedSort === 'elo' ? 'text-guru-gold' : 'text-white'}`}>
                                        {entry.elo}
                                    </span>
                                    <span className="text-gray-500 text-xs block">ELO</span>
                                </div>
                                <div>
                                    <span className={`font-bold ${selectedSort === 'winrate' ? 'text-guru-gold' : 'text-white'}`}>
                                        {(entry.winrate * 100).toFixed(1)}%
                                    </span>
                                    <span className="text-gray-500 text-xs block">Win Rate</span>
                                </div>
                                <div>
                                    <span className={`font-bold ${selectedSort === 'games' ? 'text-guru-gold' : 'text-white'}`}>
                                        {entry.gamesPlayed}
                                    </span>
                                    <span className="text-gray-500 text-xs block">Games</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Current User (if not in top list) */}
            {showCurrentUser && userEntry && !entries.find(e => e.id === currentUserId) && (
                <div className="border-t-2 border-guru-gold/30">
                    <div className="p-4 flex items-center gap-4 bg-guru-gold/5">
                        <div className="w-8 flex justify-center">
                            <span className="text-gray-400 font-mono">#{userEntry.rank}</span>
                        </div>
                        <div className="w-8">
                            {getRankChange(userEntry.rank, userEntry.previousRank)}
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                            <div className="text-guru-gold font-bold">You</div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 text-right">
                            <div>
                                <span className="font-bold text-white">{userEntry.elo}</span>
                                <span className="text-gray-500 text-xs block">ELO</span>
                            </div>
                            <div>
                                <span className="font-bold text-white">{(userEntry.winrate * 100).toFixed(1)}%</span>
                                <span className="text-gray-500 text-xs block">Win Rate</span>
                            </div>
                            <div>
                                <span className="font-bold text-white">{userEntry.gamesPlayed}</span>
                                <span className="text-gray-500 text-xs block">Games</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && entries.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    Loading leaderboard...
                </div>
            )}

            {/* Empty State */}
            {!isLoading && entries.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No players yet</p>
                </div>
            )}
        </div>
    );
};

// Mock data generator
function generateMockLeaderboard(count: number): LeaderboardEntry[] {
    const names = ['Magnus', 'Viktor', 'Sarah', 'Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Quinn'];
    const countries = ['US', 'FR', 'DE', 'UK', 'JP', 'CA', 'AU', 'BR', 'ES', 'IT'];

    return Array.from({ length: count }, (_, i) => ({
        id: `user_${i}`,
        rank: i + 1,
        previousRank: i + 1 + Math.floor(Math.random() * 5) - 2,
        username: `${names[i % names.length]}${Math.floor(Math.random() * 100)}`,
        country: countries[Math.floor(Math.random() * countries.length)],
        elo: 2000 - i * 50 + Math.floor(Math.random() * 30),
        winrate: 0.7 - i * 0.02 + Math.random() * 0.1,
        gamesPlayed: 500 - i * 20 + Math.floor(Math.random() * 50),
        gamesWon: 0,
        streak: Math.floor(Math.random() * 10),
        isOnline: Math.random() > 0.7
    }));
}

export default Leaderboard;
