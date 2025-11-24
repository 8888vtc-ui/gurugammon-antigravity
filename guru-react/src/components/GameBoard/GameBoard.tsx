import { type FC } from 'react';
import './GameBoard.css';
import './Point.css';
import './Dice.css';
import './DoublingCube.css';

export interface GameBoardProps {
    board: number[];
    whiteBar: number;
    blackBar: number;
    whiteOff: number;
    blackOff: number;
    dice: [number, number];
    cubeValue: number;
    cubeOwner: string | null;
    currentPlayer: 'white' | 'black';
    onPointClick?: (pointIndex: number) => void;
}

export const GameBoard: FC<GameBoardProps> = ({
    board,
    dice,
    cubeValue,
    cubeOwner,
    currentPlayer
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

    // Render a simple point (triangle) directly
    const renderPoint = (checkerCount: number, pointNumber: number, direction: 'up' | 'down', colorClass: 'light' | 'dark') => {
        return (
            <div key={`point-${pointNumber}`} className={`point point-${direction} point-${colorClass}`}>
                <div className="point-triangle">
                    <div className="point-number">{pointNumber}</div>
                </div>
                {checkerCount !== 0 && (
                    <div className="checkers-stack">
                        {Array.from({ length: Math.min(Math.abs(checkerCount), 5) }).map((_, i) => (
                            <div
                                key={`checker-${i}`}
                                className={`checker ${checkerCount > 0 ? 'checker-white' : 'checker-black'}`}
                            />
                        ))}
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

        return (
            <div className="dice-container">
                {dice.map((value, index) => (
                    <div key={`die-${index}`} className="die">
                        {renderPips(value)}
                    </div>
                ))}
            </div>
        );
    };

    return (
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
    );
};

