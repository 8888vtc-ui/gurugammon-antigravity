// src/types/game.ts
// Types pour les parties de backgammon côté frontend

export interface Player {
    id: string;
    name: string;
    email?: string;
    points: number;
    isPremium?: boolean;
}

export type PlayerColor = 'white' | 'black';

export interface BoardState {
    positions: number[];     // 24 positions, + = white, - = black
    whiteBar: number;        // Pièces blanches capturées
    blackBar: number;        // Pièces noires capturées
    whiteOff: number;        // Pièces blanches sorties
    blackOff: number;        // Pièces noires sorties
}

export interface DiceState {
    dice: [number, number];  // Valeurs des dés
    used: boolean[];         // Dés utilisés ou non
    doubles: boolean;        // Si doubles (4 mouvements)
    remaining: number[];     // Valeurs restantes à jouer
}

export interface CubeSnapshot {
    level: number;
    owner: PlayerColor | null;
    isCentered: boolean;
    doublePending: boolean;
    doubleOfferedBy: PlayerColor | null;
}

export interface Move {
    from: number;            // Position de départ (0-23, 24=bar)
    to: number;              // Position d'arrivée (-1 pour bear off)
    player: PlayerColor;
    diceUsed: number;        // Valeur du dé utilisée
}

export interface CrawfordState {
    enabled: boolean;
    active: boolean;
    used: boolean;
    matchLength: number | null;
    oneAwayScore: number | null;
    triggeredBy: PlayerColor | null;
}

export type GameStatus = 'waiting' | 'playing' | 'completed' | 'abandoned' | 'draw_pending';

export interface GameState {
    id: string;
    player1: Player;
    player2: Player | null;
    status: GameStatus;
    gameType: 'match' | 'money_game' | 'tournament';
    stake: number;
    winner: Player | null;
    board: BoardState;
    currentPlayer: PlayerColor;
    dice: DiceState;
    cube: CubeSnapshot;
    crawford: CrawfordState;
    whiteScore: number;
    blackScore: number;
    matchLength: number | null;
    availableMoves: Move[];
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
}

// Helper function to convert board positions to checkers
export function getCheckersForPoint(board: BoardState | null | undefined, index: number): { color: PlayerColor; count: number } | null {
    if (!board || !Array.isArray(board.positions)) return null;
    if (index < 0 || index >= board.positions.length) return null;

    const count = board.positions[index];
    if (count === 0) return null;

    return {
        color: count > 0 ? 'white' : 'black',
        count: Math.abs(count)
    };
}

// Initial board setup for backgammon
export const INITIAL_BOARD: BoardState = {
    positions: [
        2, 0, 0, 0, 0, -5,   // Positions 1-6
        0, -3, 0, 0, 0, 5,   // Positions 7-12
        -5, 0, 0, 0, 3, 0,   // Positions 13-18
        5, 0, 0, 0, 0, -2    // Positions 19-24
    ],
    whiteBar: 0,
    blackBar: 0,
    whiteOff: 0,
    blackOff: 0
};
