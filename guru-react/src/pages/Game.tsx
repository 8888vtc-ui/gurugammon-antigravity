import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Point } from '../components/Point';
import { motion } from 'framer-motion';
import { Dices, Mic, MessageSquare, RotateCcw } from 'lucide-react';

export const Game: React.FC = () => {
    const { id } = useParams();
    const [gameState, setGameState] = useState<any>(null);
    const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
    const [loadingAdvice, setLoadingAdvice] = useState(false);
    const { isConnected, lastMessage } = useWebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3001');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const { data } = await api.get(`/games/${id}`);
                setGameState(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchGame();
    }, [id]);

    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === 'gameUpdate' && lastMessage.gameId === id) {
                setGameState(lastMessage.payload);
                setCoachAdvice(null); // Clear old advice on new move
            }
        }
    }, [lastMessage, id]);

    const handleMove = async (from: number, to: number) => {
        if (!gameState) return;
        try {
            // Optimistic update could go here
            await api.post(`/games/${id}/move`, { from, to });
        } catch (err) {
            console.error('Move failed', err);
        }
    };

    const handleRoll = async () => {
        try {
            await api.post(`/games/${id}/roll`);
        } catch (err) {
            console.error(err);
        }
    };

    const getCoachAdvice = async () => {
        setLoadingAdvice(true);
        try {
            const { data } = await api.post(`/games/${id}/coach`);
            setCoachAdvice(data.advice);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAdvice(false);
        }
    };

    if (!gameState) return <div className="min-h-screen bg-guru-bg flex items-center justify-center text-white">Loading Game...</div>;

    const isMyTurn = gameState.currentPlayer === (gameState.player1.id === user.id ? 'white' : 'black');
    // const myColor = gameState.player1.id === user.id ? 'white' : 'black'; // Unused for now

    return (
        <div className="min-h-screen bg-guru-bg text-white flex flex-col">
            {/* Header */}
            <div className="bg-[#1a1a1a] border-b border-gray-800 p-4 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Player 1</span>
                        <span className="font-bold text-white">{gameState.player1.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-guru-gold px-4">VS</div>
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Player 2</span>
                        <span className="font-bold text-white">{gameState.player2?.name || 'AI Coach'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isMyTurn && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRoll}
                            className="bg-guru-gold text-black px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-yellow-500/20"
                        >
                            <Dices className="w-5 h-5" /> Roll Dice
                        </motion.button>
                    )}
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
            </div>

            {/* Main Board Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar (History/Chat) */}
                <div className="w-64 bg-[#151515] border-r border-gray-800 hidden lg:flex flex-col">
                    <div className="p-4 border-b border-gray-800 font-bold text-gray-400">Game History</div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm text-gray-300">
                        {/* Placeholder history */}
                        <div className="opacity-50 italic">Game started...</div>
                    </div>
                </div>

                {/* Board */}
                <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center p-4 md:p-10 relative">
                    {/* The Board Container */}
                    <div className="aspect-[4/3] w-full max-w-5xl bg-[#4a3c31] rounded-lg border-[16px] border-[#2e231b] shadow-2xl relative flex">

                        {/* Left Quadrant */}
                        <div className="flex-1 flex flex-col border-r-4 border-[#2e231b]">
                            <div className="flex-1 flex border-b border-[#2e231b]/20">
                                {[12, 13, 14, 15, 16, 17].map(i => (
                                    <Point
                                        key={i}
                                        index={i}
                                        isTop={true}
                                        checkers={getCheckersForPoint(gameState.board, i)}
                                        onMove={handleMove}
                                    />
                                ))}
                            </div>
                            <div className="flex-1 flex">
                                {[11, 10, 9, 8, 7, 6].map(i => (
                                    <Point
                                        key={i}
                                        index={i}
                                        isTop={false}
                                        checkers={getCheckersForPoint(gameState.board, i)}
                                        onMove={handleMove}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Bar */}
                        <div className="w-16 bg-[#2e231b] flex flex-col justify-center items-center relative shadow-inner">
                            {/* Bar Checkers would go here */}
                        </div>

                        {/* Right Quadrant */}
                        <div className="flex-1 flex flex-col border-l-4 border-[#2e231b]">
                            <div className="flex-1 flex border-b border-[#2e231b]/20">
                                {[18, 19, 20, 21, 22, 23].map(i => (
                                    <Point
                                        key={i}
                                        index={i}
                                        isTop={true}
                                        checkers={getCheckersForPoint(gameState.board, i)}
                                        onMove={handleMove}
                                    />
                                ))}
                            </div>
                            <div className="flex-1 flex">
                                {[5, 4, 3, 2, 1, 0].map(i => (
                                    <Point
                                        key={i}
                                        index={i}
                                        isTop={false}
                                        checkers={getCheckersForPoint(gameState.board, i)}
                                        onMove={handleMove}
                                    />
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Dice Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Render active dice here with framer-motion */}
                    </div>
                </div>

                {/* Right Sidebar (Coach) */}
                <div className="w-80 bg-[#151515] border-l border-gray-800 flex flex-col">
                    <div className="p-4 border-b border-gray-800 font-bold text-guru-gold flex items-center gap-2">
                        <ShieldIcon className="w-5 h-5" /> AI Coach
                    </div>

                    <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                        {!coachAdvice ? (
                            <div className="text-gray-500">
                                <p className="mb-4">Make a move to get analysis.</p>
                                <button
                                    onClick={getCoachAdvice}
                                    disabled={loadingAdvice}
                                    className="px-6 py-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-full text-white font-medium transition-colors flex items-center gap-2 mx-auto"
                                >
                                    {loadingAdvice ? (
                                        <RotateCcw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <MessageSquare className="w-4 h-4" />
                                    )}
                                    Analyze Position
                                </button>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#1e1e1e] p-4 rounded-xl border border-gray-700 text-left w-full"
                            >
                                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                                    {coachAdvice}
                                </p>
                                <button className="text-guru-gold text-sm flex items-center gap-2 hover:underline">
                                    <Mic className="w-4 h-4" /> Listen to explanation
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper to map board state to props
const getCheckersForPoint = (board: any, index: number) => {
    if (!board || !board.positions) return null;
    const count = board.positions[index];
    if (count === 0) return null;
    return {
        color: count > 0 ? 'white' : 'black',
        count: Math.abs(count)
    } as { color: 'white' | 'black'; count: number };
};

const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
