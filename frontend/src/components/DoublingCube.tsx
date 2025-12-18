import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertTriangle } from 'lucide-react';

export type CubeAction = 'double' | 'take' | 'pass' | 'redouble' | 'beaver' | 'raccoon';

interface CubeState {
    level: number;
    owner: 'white' | 'black' | null;
    isCentered: boolean;
}

interface CubeRulesOptions {
    jacoby?: boolean;
    crawford?: boolean;
    beaver?: boolean;
    raccoon?: boolean;
    murphy?: boolean;
    holland?: boolean;
}

interface DoublingCubeProps {
    cube: CubeState;
    currentPlayer: 'white' | 'black';
    isMyTurn: boolean;
    canDouble: boolean;
    doublePending?: boolean;
    doubleOfferedBy?: 'white' | 'black' | null;
    rules?: CubeRulesOptions;
    onDouble: () => void;
    onTake: () => void;
    onPass: () => void;
    onBeaver?: () => void;
    onRaccoon?: () => void;
    isPlayerColor: 'white' | 'black';
    matchInfo?: {
        whiteScore: number;
        blackScore: number;
        matchLength: number | null;
        isCrawfordGame?: boolean;
        isPostCrawford?: boolean;
    };
}

const CubeFace: React.FC<{ value: number; size?: 'sm' | 'md' | 'lg' }> = ({ value, size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg'
    };

    return (
        <motion.div
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 360 }}
            transition={{ duration: 0.5 }}
            className={`${sizeClasses[size]} bg-gradient-to-br from-white to-gray-200 rounded-lg shadow-lg flex items-center justify-center font-bold text-black border-2 border-gray-300`}
        >
            {value}
        </motion.div>
    );
};

export const DoublingCube: React.FC<DoublingCubeProps> = ({
    cube,
    currentPlayer: _currentPlayer,
    isMyTurn,
    canDouble,
    doublePending = false,
    doubleOfferedBy = null,
    rules = {},
    onDouble,
    onTake,
    onPass,
    onBeaver,
    onRaccoon,
    isPlayerColor,
    matchInfo
}) => {
    const isDoublePendingForMe = doublePending && doubleOfferedBy !== isPlayerColor;
    const iOwn = cube.owner === isPlayerColor;
    const showDoubleButton = isMyTurn && canDouble && !doublePending && (cube.isCentered || iOwn);

    // Check if beaver/raccoon are available
    const canBeaver = rules.beaver && isDoublePendingForMe && doubleOfferedBy !== null;
    const canRaccoon = rules.raccoon && rules.beaver && doublePending && doubleOfferedBy === isPlayerColor;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Cube Display */}
            <motion.div
                className={`relative ${cube.isCentered ? '' : cube.owner === 'white' ? 'translate-x-[-20px]' : 'translate-x-[20px]'}`}
                animate={{
                    x: cube.isCentered ? 0 : (cube.owner === 'white' ? -20 : 20),
                    scale: doublePending ? 1.1 : 1
                }}
            >
                <CubeFace value={cube.level} size="lg" />

                {/* Owner indicator */}
                {!cube.isCentered && (
                    <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full ${cube.owner === 'white' ? 'bg-white shadow-lg' : 'bg-red-800'
                        }`} />
                )}

                {/* Pending double animation */}
                {doublePending && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"
                    >
                        <span className="text-black text-xs font-bold">!</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Match Info */}
            {matchInfo && matchInfo.matchLength && (
                <div className="text-xs text-gray-400 text-center">
                    <span>Match to {matchInfo.matchLength}</span>
                    <div className="flex gap-4 justify-center mt-1">
                        <span className={matchInfo.whiteScore >= (matchInfo.matchLength - 1) ? 'text-yellow-400' : ''}>
                            White: {matchInfo.whiteScore}
                        </span>
                        <span className={matchInfo.blackScore >= (matchInfo.matchLength - 1) ? 'text-yellow-400' : ''}>
                            Black: {matchInfo.blackScore}
                        </span>
                    </div>
                    {matchInfo.isCrawfordGame && (
                        <span className="text-orange-400 text-xs mt-1 block">Crawford Game - No Doubles</span>
                    )}
                </div>
            )}

            {/* Double Pending Response */}
            <AnimatePresence>
                {isDoublePendingForMe && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col gap-3 bg-[#1a1a1a] p-4 rounded-xl border border-yellow-600/50"
                    >
                        <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                            <AlertTriangle className="w-4 h-4" />
                            Opponent Doubled to {cube.level}!
                        </div>

                        <div className="flex gap-2">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onTake}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Take
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onPass}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Pass
                            </motion.button>
                        </div>

                        {/* Beaver option */}
                        {canBeaver && onBeaver && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onBeaver}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                🦫 Beaver to {cube.level * 2}
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Raccoon option (after beaver) */}
            <AnimatePresence>
                {canRaccoon && onRaccoon && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-[#1a1a1a] p-4 rounded-xl border border-purple-600/50"
                    >
                        <div className="flex items-center gap-2 text-purple-400 text-sm font-bold mb-3">
                            🦝 Opponent Beavered!
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onRaccoon}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold"
                        >
                            Raccoon to {cube.level * 2}!
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Double Button */}
            <AnimatePresence>
                {showDoubleButton && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onDouble}
                        className="bg-gradient-to-r from-yellow-600 to-orange-600 text-black px-6 py-2 rounded-full font-bold shadow-lg hover:shadow-yellow-500/25 transition-shadow"
                    >
                        {cube.isCentered ? 'Double' : 'Redouble'} to {cube.level * 2}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Rules enabled indicator */}
            {(rules.jacoby || rules.crawford || rules.beaver) && (
                <div className="flex gap-2 flex-wrap justify-center">
                    {rules.jacoby && (
                        <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full">Jacoby</span>
                    )}
                    {rules.crawford && (
                        <span className="text-xs px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded-full">Crawford</span>
                    )}
                    {rules.beaver && (
                        <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full">Beaver</span>
                    )}
                    {rules.raccoon && (
                        <span className="text-xs px-2 py-0.5 bg-pink-900/50 text-pink-300 rounded-full">Raccoon</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default DoublingCube;
