import type { Player } from './player';
export type GameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type GameType = 'match' | 'money_game' | 'tournament';
export interface BoardState {
    positions: number[];
    whiteBar: number;
    blackBar: number;
    whiteOff: number;
    blackOff: number;
}
export interface DiceState {
    dice: [number, number];
    used: boolean[];
    doubles: boolean;
    remaining: number[];
}
export interface Move {
    from: number;
    to: number;
    player: 'white' | 'black';
    diceUsed: number;
}
export type PlayerColor = 'white' | 'black';
export interface ValidationResult {
    valid: boolean;
    error?: string;
    availableMoves?: Move[];
}
export interface GameState {
    id: string;
    player1: Player;
    player2: Player | null;
    status: GameStatus;
    gameType: GameType;
    stake: number;
    winner: Player | null;
    board: BoardState;
    currentPlayer: 'white' | 'black';
    dice: DiceState;
    availableMoves: Move[];
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
}
export interface Game {
    id: string;
    player1: Player;
    player2: Player | null;
    status: GameStatus;
    gameType: GameType;
    stake: number;
    winner: Player | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
}
export interface CreateGameRequest {
    gameType: GameType;
    stake: number;
}
export interface JoinGameRequest {
    gameId: string;
}
export interface MakeMoveRequest {
    from: number;
    to: number;
    diceUsed: number;
}
export declare const INITIAL_BOARD: BoardState;
export declare function createGame(player1: Player, gameType: GameType, stake: number): Game;
export declare function createInitialGameState(player1: Player): GameState;
export declare function startGame(game: Game, player2: Player): Game;
export declare function finishGame(game: Game, winner: Player): Game;
export declare function isGameAvailable(game: Game): boolean;
export declare function getGameDuration(game: Game): number | null;
//# sourceMappingURL=game.d.ts.map