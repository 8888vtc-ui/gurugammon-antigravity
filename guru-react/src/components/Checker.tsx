import React from 'react';
import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CheckerProps {
    color: 'white' | 'black';
    count: number;
    pointIndex: number;
    canDrag: boolean;
}

export const Checker: React.FC<CheckerProps> = ({ color, count, pointIndex, canDrag }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'CHECKER',
        item: { color, fromPoint: pointIndex },
        canDrag: canDrag,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [color, pointIndex, canDrag]);

    const bgColor = color === 'white' ? 'bg-[#D2B48C]' : 'bg-[#8B0000]';
    const borderColor = color === 'white' ? 'border-[#8B4513]' : 'border-[#2F0000]';
    const ringColor = color === 'white' ? 'ring-[#DEB887]' : 'ring-[#A52A2A]';

    // Stack effect
    const checkers = [];
    const maxStack = 5; // Visual stack limit
    const displayCount = Math.min(count, maxStack);

    for (let i = 0; i < displayCount; i++) {
        checkers.push(
            <motion.div
                key={i}
                ref={i === displayCount - 1 ? drag : null}
                initial={false}
                className={clsx(
                    'w-10 h-10 rounded-full border-4 shadow-lg absolute',
                    bgColor,
                    borderColor,
                    i === displayCount - 1 && canDrag ? 'cursor-grab active:cursor-grabbing hover:ring-2' : '',
                    i === displayCount - 1 && canDrag ? ringColor : '',
                    isDragging && i === displayCount - 1 ? 'opacity-50' : 'opacity-100'
                )}
                style={{
                    bottom: `${i * 8}px`,
                    zIndex: i,
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 6px rgba(0,0,0,0.4)'
                }}
                whileHover={canDrag && i === displayCount - 1 ? { scale: 1.1, boxShadow: "0 0 15px rgba(255, 215, 0, 0.6)" } : {}}
            >
                {/* Inner detail for realism */}
                <div className="w-full h-full rounded-full border border-black/10 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border border-black/5 bg-black/5" />
                </div>
                {i === displayCount - 1 && count > maxStack && (
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-black/70">
                        {count}
                    </div>
                )}
            </motion.div>
        );
    }

    return (
        <div className="relative w-10 h-full flex flex-col-reverse items-center justify-start min-h-[50px]">
            {checkers}
        </div>
    );
};
