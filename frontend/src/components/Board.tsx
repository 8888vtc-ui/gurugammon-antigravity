import React from 'react';
import { Point } from './Point';
import { Dice } from './Dice';
import { Cube } from './Cube';
import { BoardState, PlayerColor, getCheckersForPoint } from '../types/game';

interface BoardProps {
    board: BoardState | null | undefined;
    onMove: (from: number, to: number) => void;
    dice: number[];
    rolling: boolean;
    cubeValue: number;
    cubeOwner: PlayerColor | null;
}

export const Board: React.FC<BoardProps> = ({ board, onMove, dice, rolling, cubeValue, cubeOwner }) => {
    // Safe getter for checkers
    const getCheckers = (index: number) => getCheckersForPoint(board, index);

    return (
        <div className="relative w-full max-w-6xl aspect-[4/3] bg-[#2E1A10] rounded-xl border-[20px] border-[#1A0F0A] shadow-2xl flex overflow-hidden">
            {/* Wood Texture Overlay */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />

            {/* Left Quadrant */}
            <div className="flex-1 flex flex-col border-r-8 border-[#1A0F0A] relative">
                <div className="flex-1 flex border-b-2 border-[#1A0F0A]/30 bg-[#4E342E]">
                    {[12, 13, 14, 15, 16, 17].map(i => (
                        <Point key={i} index={i} isTop={true} checkers={getCheckers(i)} onMove={onMove} />
                    ))}
                </div>
                <div className="flex-1 flex bg-[#4E342E]">
                    {[11, 10, 9, 8, 7, 6].map(i => (
                        <Point key={i} index={i} isTop={false} checkers={getCheckers(i)} onMove={onMove} />
                    ))}
                </div>
            </div>

            {/* Bar */}
            <div className="w-20 bg-[#1A0F0A] flex flex-col items-center justify-center relative shadow-inner z-10">
                <div className="h-full w-2 bg-[#0F0805] absolute left-1/2 -translate-x-1/2" />
                {/* Bar Checkers - show captured pieces */}
                {board && (
                    <div className="absolute inset-0 flex flex-col items-center">
                        {/* White bar on top */}
                        <div className="flex-1 flex flex-col items-center justify-start pt-4">
                            {board.whiteBar > 0 && (
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 shadow-lg" />
                                    {board.whiteBar > 1 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-black font-bold text-sm">
                                            {board.whiteBar}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Black bar on bottom */}
                        <div className="flex-1 flex flex-col items-center justify-end pb-4">
                            {board.blackBar > 0 && (
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-red-900 border-2 border-red-800 shadow-lg" />
                                    {board.blackBar > 1 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                                            {board.blackBar}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Quadrant */}
            <div className="flex-1 flex flex-col border-l-8 border-[#1A0F0A] relative">
                <div className="flex-1 flex border-b-2 border-[#1A0F0A]/30 bg-[#4E342E]">
                    {[18, 19, 20, 21, 22, 23].map(i => (
                        <Point key={i} index={i} isTop={true} checkers={getCheckers(i)} onMove={onMove} />
                    ))}
                </div>
                <div className="flex-1 flex bg-[#4E342E]">
                    {[5, 4, 3, 2, 1, 0].map(i => (
                        <Point key={i} index={i} isTop={false} checkers={getCheckers(i)} onMove={onMove} />
                    ))}
                </div>
            </div>

            {/* Center Overlay Elements */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                <div className="flex gap-12 items-center">
                    <Cube value={cubeValue} owner={cubeOwner} />
                    <Dice values={dice} rolling={rolling} />
                </div>
            </div>

            {/* Bearing Off Areas */}
            {board && (
                <>
                    {/* White bear off (right side) */}
                    {board.whiteOff > 0 && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-900/50 rounded px-2 py-1">
                            <span className="text-white text-sm font-bold">⬜ {board.whiteOff}</span>
                        </div>
                    )}
                    {/* Black bear off (right side) */}
                    {board.blackOff > 0 && (
                        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-green-900/50 rounded px-2 py-1">
                            <span className="text-white text-sm font-bold">🔴 {board.blackOff}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

