import React from 'react';
import { useDrop } from 'react-dnd';
import clsx from 'clsx';
import { Checker } from './Checker';

interface PointProps {
    index: number;
    checkers: { color: 'white' | 'black'; count: number } | null;
    onMove: (from: number, to: number) => void;
    isTop: boolean;
    highlight?: boolean;
    canMoveTo?: boolean;
}

export const Point: React.FC<PointProps> = ({ index, checkers, onMove, isTop, highlight, canMoveTo }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'CHECKER',
        drop: (item: { fromPoint: number }) => {
            onMove(item.fromPoint, index);
        },
        canDrop: () => canMoveTo ?? true, // Simplified, validation happens in parent/backend
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }), [index, onMove, canMoveTo]);

    const isEven = index % 2 === 0;
    // Dark theme: #1e1e1e / #2d2d2d
    const pointColor = isEven ? 'border-b-[#2d2d2d]' : 'border-b-[#1e1e1e]';

    // Triangle shape using borders
    // Top points point down, Bottom points point up
    const triangleClass = isTop
        ? `border-l-[25px] border-r-[25px] border-b-[180px] border-l-transparent border-r-transparent ${pointColor}`
        : `border-l-[25px] border-r-[25px] border-t-[180px] border-l-transparent border-r-transparent ${isEven ? 'border-t-[#2d2d2d]' : 'border-t-[#1e1e1e]'}`;

    return (
        <div
            ref={drop}
            className={clsx(
                'relative h-full flex justify-center flex-1 min-w-[50px]',
                isTop ? 'items-start' : 'items-end',
                isOver && 'bg-white/5',
                highlight && 'bg-yellow-500/10'
            )}
        >
            {/* The Triangle Background */}
            <div className={clsx('absolute w-0 h-0 pointer-events-none', isTop ? 'top-0' : 'bottom-0', triangleClass)} />

            {/* Checkers Container */}
            <div className={clsx('z-10 h-[80%]', isTop ? 'mt-2' : 'mb-2')}>
                {checkers && checkers.count > 0 && (
                    <Checker
                        color={checkers.color}
                        count={checkers.count}
                        pointIndex={index}
                        canDrag={true} // Logic handled by parent usually
                    />
                )}
            </div>

            {/* Point Index Label (optional for debug/learning) */}
            <span className={clsx("absolute text-[10px] text-gray-600", isTop ? "top-0" : "bottom-0")}>
                {index + 1}
            </span>
        </div>
    );
};
