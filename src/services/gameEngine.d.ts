import { BoardState, DiceState, Move, PlayerColor, ValidationResult } from '../types/game';
export declare class BackgammonEngine {
    static createInitialBoard(): BoardState;
    static rollDice(): DiceState;
    static validateMove(move: Move, board: BoardState, dice: DiceState): ValidationResult;
    private static validateFromBar;
    private static validateBearingOff;
    private static validateNormalMove;
    private static canLandOn;
    private static allPiecesInHome;
    static applyMove(move: Move, board: BoardState): BoardState;
    static useDie(diceValue: number, dice: DiceState): DiceState;
    static calculateAvailableMoves(player: PlayerColor, board: BoardState, dice: DiceState): Move[];
    static checkWinCondition(board: BoardState): PlayerColor | null;
    static calculatePipCount(board: BoardState): {
        white: number;
        black: number;
    };
}
//# sourceMappingURL=gameEngine.d.ts.map