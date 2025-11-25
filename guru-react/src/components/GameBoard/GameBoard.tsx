import { type FC } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { Checker } from './Checker.tsx';
import './GameBoard.css';
import './Point.css';
import './Dice.css';
import './DoublingCube.css';
import './Interactive.css';

export interface GameBoardProps {
    board: number[];
    whiteBar: number;
    blackBar: number;
    whiteOff: number;
    blackOff: number;
    dice: [number, number];
    /** Indique si une animation de roulage de dés est en cours. */
    isRollingDice?: boolean;
    cubeValue: number;
    cubeOwner: string | null;
    currentPlayer: 'white' | 'black';
    /** Dernier coup joué (indices 0-23), utilisé pour le surlignage visuel. */
    lastMove?: { from: number; to: number } | null;
    /** Index sélectionné localement (mode jeu local), pour l'UI. */
    selectedPoint?: number | null;
    /** Destinations valides calculées localement (mode jeu local), pour l'UI. */
    validMoves?: number[];
    /** Coup suggéré par l'IA à surligner sur le plateau. */
    hintMove?: { from: number; to: number } | null;
    onPointClick?: (pointIndex: number) => void;
}

export const GameBoard: FC<GameBoardProps> = ({
    board,
    dice,
    isRollingDice,
    cubeValue,
    currentPlayer,
    lastMove,
    hintMove,
    selectedPoint,
    validMoves,
    onPointClick
}) => {
    // Split board into quadrants for proper backgammon layout
    // From white's perspective (bottom):
    // Bottom Right: Points 1-6
    // Bottom Left: Points 7-12
    // Top Left: Points 13-18 
    // Top Right: Points 19-24
    const bottomRight = board.slice(0, 6);        // Points 1-6
    const bottomLeft = board.slice(6, 12);        // Points 7-12
    const topLeft = board.slice(12, 18).reverse(); // Points 13-18 (reversed for display)
    const topRight = board.slice(18, 24).reverse(); // Points 19-24 (reversed for display)

    // Render a point (triangle) and its stack of animated checkers
    const renderPoint = (checkerCount: number, pointNumber: number, direction: 'up' | 'down', colorClass: 'light' | 'dark') => {
        // Les points dans le tableau board sont 0-indexés (0-23), mais pointNumber est 1-24
        // L'index réel dans le tableau board[]
        const boardIndex = pointNumber - 1; 
        
        const isSelected = selectedPoint === boardIndex;
        const isValidMove = Array.isArray(validMoves) && validMoves.includes(boardIndex);
        
        const isLastFrom = lastMove && lastMove.from === boardIndex;
        const isLastTo = lastMove && lastMove.to === boardIndex;
        const isHintFrom = hintMove && hintMove.from === boardIndex;
        const isHintTo = hintMove && hintMove.to === boardIndex;

        const player = checkerCount > 0 ? 'white' : 'black';
        const absoluteCount = Math.abs(checkerCount);
        
        const pointClasses = [
            'point',
            `point-${direction}`,
            `point-${colorClass}`,
            isSelected ? 'point-selected' : '',
            isValidMove ? 'point-valid-move' : '',
            isLastFrom ? 'point-last-from' : '',
            isLastTo ? 'point-last-to' : '',
            isHintFrom ? 'point-hint-from' : '',
            isHintTo ? 'point-hint-to' : ''
        ]
            .filter(Boolean)
            .join(' ');
        
        return (
            <div 
                key={`point-${pointNumber}`} 
                className={pointClasses}
                onClick={() => onPointClick?.(boardIndex)}
                style={{ cursor: 'pointer' }}
            >
                <div className="point-triangle">
                    <div className="point-number">{pointNumber}</div>
                </div>
                {absoluteCount > 0 && (
                    <div className="checkers-stack">
                        {Array.from({ length: Math.min(absoluteCount, 5) }).map((_, i) => (
                            <Checker
                                key={`checker-${boardIndex}-${i}`}
                                player={player}
                                position={{ point: boardIndex, stack: i }}
                            />
                        ))}
                        {absoluteCount > 5 && (
                            <div className={`checker-count checker-count-${player}`}>
                                +{absoluteCount - 5}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render dice
    const renderDice = () => {
        const renderPips = (value: number) => {
            // Validate dice value
            if (!value || value < 1 || value > 6) {
                return <div className="die-face" />;
            }

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

        const valuesToRender = dice.length > 0 ? dice : [0, 0];

        return (
            <div className="dice-container">
                {valuesToRender.map((value, index) => (
                    <motion.div
                        key={`die-${index}`}
                        className="die"
                        animate={isRollingDice ? { rotate: [0, 25, -25, 0], y: [0, -6, 0, -3] } : { rotate: 0, y: 0 }}
                        transition={isRollingDice ? { duration: 0.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                    >
                        {isRollingDice ? <div className="die-face" /> : renderPips(value)}
                    </motion.div>
                ))}
            </div>
        );
    };

    return (
        <LayoutGroup>
            <div className="game-board-container">
                <div className="game-board">
                {/* Top Half */}
                <div className="board-half board-top">
                    {/* Top Left Quadrant (Points 13-18) */}
                    <div className="quadrant quadrant-top-left">
                        {topLeft.map((checkers, index) =>
                            renderPoint(checkers, 18 - index, 'down', (18 - index) % 2 === 0 ? 'dark' : 'light')
                        )}
                    </div>

                    <div className="bar" />

                    {/* Top Right Quadrant (Points 19-24) */}
                    <div className="quadrant quadrant-top-right">
                        {topRight.map((checkers, index) =>
                            renderPoint(checkers, 24 - index, 'down', (24 - index) % 2 === 0 ? 'dark' : 'light')
                        )}
                    </div>
                </div>

                {/* Middle - Dice and Cube */}
                <div className="board-middle">
                    {renderDice()}
                    <div className="doubling-cube">
                        <div className="cube-face">
                            <div className="cube-value">{cubeValue}</div>
                        </div>
                    </div>
                </div>

                {/* Bottom Half */}
                <div className="board-half board-bottom">
                    {/* Bottom Left Quadrant (Points 12-7) */}
                    <div className="quadrant quadrant-bottom-left">
                        {bottomLeft.slice().reverse().map((checkers, index) =>
                            renderPoint(checkers, 12 - index, 'up', (12 - index) % 2 === 0 ? 'dark' : 'light')
                        )}
                    </div>

                    <div className="bar" />

                    {/* Bottom Right Quadrant (Points 6-1) */}
                    <div className="quadrant quadrant-bottom-right">
                        {bottomRight.slice().reverse().map((checkers, index) =>
                            renderPoint(checkers, 6 - index, 'up', (6 - index) % 2 === 0 ? 'dark' : 'light')
                        )}
                    </div>
                </div>
            </div>

            {/* Current Player Indicator */}
            <div className="current-player-indicator">
                <span className={`indicator-dot ${currentPlayer === 'white' ? 'white' : 'black'}`} />
                <span className="indicator-text">
                    {currentPlayer === 'white' ? 'White' : 'Black'} to play
                </span>
            </div>
        </div>
    </LayoutGroup>
    );
};
