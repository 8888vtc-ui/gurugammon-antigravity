import { type FC } from 'react';
import { motion } from 'framer-motion';
import './Dice.css';

export interface DiceProps {
    dice: [number, number];
    isRolling?: boolean;
}

export const Dice: FC<DiceProps> = ({ dice, isRolling = false }) => {
    const renderPips = (value: number) => {
        const pipPositions: Record<number, number[][]> = {
            1: [[1, 1]],
            2: [[0, 0], [2, 2]],
            3: [[0, 0], [1, 1], [2, 2]],
            4: [[0, 0], [0, 2], [2, 0], [2, 2]],
            5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
            6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]]
        };

        const positions = pipPositions[value] || [];

        return (
            <div className="die-face">
                {positions.map(([row, col], index) => (
                    <div
                        key={`pip-${index}`}
                        className="die-pip"
                        style={{
                            gridRow: row + 1,
                            gridColumn: col + 1
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="dice-container">
            {dice.map((value, index) => (
                <motion.div
                    key={`die-${index}`}
                    className={`die ${isRolling ? 'die-rolling' : ''}`}
                    initial={{ rotateX: 0, rotateY: 0, rotateZ: 0 }}
                    animate={
                        isRolling
                            ? {
                                rotateX: [0, 360, 720],
                                rotateY: [0, 360, 720],
                                rotateZ: [0, 180, 360]
                            }
                            : { rotateX: 0, rotateY: 0, rotateZ: 0 }
                    }
                    transition={{
                        duration: 0.6,
                        ease: 'easeOut'
                    }}
                >
                    {renderPips(value)}
                </motion.div>
            ))}
        </div>
    );
};
