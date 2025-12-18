import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, X, RotateCcw, Home, Share2, TrendingUp } from 'lucide-react';
import { Player, PlayerColor } from '../types/game';

interface GameEndModalProps {
    isOpen: boolean;
    onClose: () => void;
    winner: Player | null;
    loser: Player | null;
    isPlayerWinner: boolean;
    currentPlayerColor: PlayerColor;
    gameResult: 'single' | 'gammon' | 'backgammon';
    pointsWon: number;
    cubeValue: number;
    matchScore: { white: number; black: number };
    matchLength: number | null;
    onRematch: () => void;
    onExit: () => void;
    onShare?: () => void;
}

const resultMultipliers = {
    single: 1,
    gammon: 2,
    backgammon: 3
};

const resultLabels = {
    single: 'Single Game',
    gammon: 'Gammon!',
    backgammon: 'Backgammon!'
};

export const GameEndModal: React.FC<GameEndModalProps> = ({
    isOpen,
    onClose,
    winner,
    loser,
    isPlayerWinner,
    currentPlayerColor,
    gameResult,
    pointsWon,
    cubeValue,
    matchScore,
    matchLength,
    onRematch,
    onExit,
    onShare
}) => {
    if (!isOpen) return null;

    const totalPoints = pointsWon * cubeValue * resultMultipliers[gameResult];
    const isMatchOver = matchLength && (matchScore.white >= matchLength || matchScore.black >= matchLength);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 50 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] rounded-2xl p-8 max-w-md w-full mx-4 border border-[#333] shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Trophy/Medal Animation */}
                    <div className="flex justify-center mb-6">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                            className={`p-6 rounded-full ${isPlayerWinner
                                    ? 'bg-gradient-to-br from-yellow-500 to-amber-600'
                                    : 'bg-gradient-to-br from-gray-600 to-gray-700'
                                } shadow-lg`}
                        >
                            {isPlayerWinner ? (
                                <Trophy className="w-16 h-16 text-white" />
                            ) : (
                                <Medal className="w-16 h-16 text-white" />
                            )}
                        </motion.div>
                    </div>

                    {/* Result Title */}
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`text-3xl font-bold text-center mb-2 ${isPlayerWinner ? 'text-yellow-400' : 'text-gray-400'
                            }`}
                    >
                        {isPlayerWinner ? 'Victory!' : 'Defeat'}
                    </motion.h2>

                    {/* Game Result Type */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-center mb-6"
                    >
                        <span className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${gameResult === 'backgammon'
                                ? 'bg-red-900/50 text-red-300 border border-red-700'
                                : gameResult === 'gammon'
                                    ? 'bg-orange-900/50 text-orange-300 border border-orange-700'
                                    : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                            }`}>
                            {resultLabels[gameResult]}
                        </span>
                    </motion.div>

                    {/* Players */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex justify-between items-center mb-6 px-4"
                    >
                        <div className="text-center">
                            <div className={`w-12 h-12 rounded-full ${winner && isPlayerWinner ? 'ring-2 ring-yellow-400' : ''
                                } bg-white mx-auto mb-2 flex items-center justify-center`}>
                                <span className="text-2xl">⬜</span>
                            </div>
                            <p className="text-sm text-gray-400 truncate max-w-[80px]">
                                {currentPlayerColor === 'white' ? 'You' : winner?.name || 'Opponent'}
                            </p>
                        </div>

                        <div className="text-center">
                            <p className="text-xl font-bold text-white">
                                {matchScore.white} - {matchScore.black}
                            </p>
                            {matchLength && (
                                <p className="text-xs text-gray-500">
                                    First to {matchLength}
                                </p>
                            )}
                        </div>

                        <div className="text-center">
                            <div className={`w-12 h-12 rounded-full ${winner && !isPlayerWinner ? 'ring-2 ring-yellow-400' : ''
                                } bg-red-900 mx-auto mb-2 flex items-center justify-center`}>
                                <span className="text-2xl">🔴</span>
                            </div>
                            <p className="text-sm text-gray-400 truncate max-w-[80px]">
                                {currentPlayerColor === 'black' ? 'You' : loser?.name || 'Opponent'}
                            </p>
                        </div>
                    </motion.div>

                    {/* Points Won */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-[#222] rounded-xl p-4 mb-6"
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Points won</span>
                            <div className="flex items-center gap-2">
                                <TrendingUp className={`w-4 h-4 ${isPlayerWinner ? 'text-green-400' : 'text-red-400'}`} />
                                <span className={`text-xl font-bold ${isPlayerWinner ? 'text-green-400' : 'text-red-400'}`}>
                                    {isPlayerWinner ? '+' : '-'}{totalPoints}
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex justify-between">
                            <span>Base: {pointsWon}</span>
                            <span>Cube: ×{cubeValue}</span>
                            <span>Result: ×{resultMultipliers[gameResult]}</span>
                        </div>
                    </motion.div>

                    {/* Match Over Message */}
                    {isMatchOver && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.7 }}
                            className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 rounded-xl p-4 mb-6 border border-yellow-700/50"
                        >
                            <p className="text-center text-yellow-300 font-bold">
                                🏆 Match Complete! 🏆
                            </p>
                            <p className="text-center text-yellow-200/70 text-sm mt-1">
                                {isPlayerWinner ? 'Congratulations, you won the match!' : 'Better luck next time!'}
                            </p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex gap-3"
                    >
                        <button
                            onClick={onRematch}
                            className="flex-1 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-yellow-500/25"
                        >
                            <RotateCcw className="w-5 h-5" />
                            Rematch
                        </button>

                        {onShare && (
                            <button
                                onClick={onShare}
                                className="bg-[#333] hover:bg-[#444] text-white py-3 px-4 rounded-xl transition-colors"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={onExit}
                            className="bg-[#333] hover:bg-[#444] text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <Home className="w-5 h-5" />
                        </button>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GameEndModal;
