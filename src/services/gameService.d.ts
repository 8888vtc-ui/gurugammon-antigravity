import { GameState, DiceState, Move, MakeMoveRequest } from '../types/game';
export declare class GameService {
    static createGameState(player1Id: number, gameType: string, stake: number): Promise<GameState>;
    static startGame(gameId: number, player2Id: number): Promise<GameState>;
    static loadGameState(gameId: number): Promise<GameState | null>;
    static makeMove(gameId: number, playerId: number, moveRequest: MakeMoveRequest): Promise<GameState>;
    static rollDice(gameId: number, playerId: number): Promise<DiceState>;
    static getAvailableMoves(gameId: number, playerId: number): Promise<Move[]>;
    static getPipCount(gameId: number): Promise<{
        white: number;
        black: number;
    }>;
}
//# sourceMappingURL=gameService.d.ts.map