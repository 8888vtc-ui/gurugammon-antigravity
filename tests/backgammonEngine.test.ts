import { BackgammonEngine } from '../src/services/gameEngine';
import type { BoardState, DiceState, Move } from '../src/types/game';

const makeEmptyBoard = (): BoardState => ({
  positions: Array(24).fill(0),
  whiteBar: 0,
  blackBar: 0,
  whiteOff: 0,
  blackOff: 0
});

const buildDice = (remaining: number[], doubles = false): DiceState => ({
  dice: remaining.length >= 2 ? [remaining[0], remaining[1]] : [remaining[0] ?? 0, remaining[1] ?? 0],
  used: [false, false],
  doubles,
  remaining
});

describe('BackgammonEngine regression rules', () => {
  it('rejects moves that ignore the highest available die', () => {
    const board = makeEmptyBoard();
    board.positions[0] = 1; // White checker on point 1

    const dice = buildDice([6, 5]);
    const illegalMove: Move = {
      from: 0,
      to: 5,
      player: 'white',
      diceUsed: 5
    };

    const validation = BackgammonEngine.validateMove(illegalMove, board, dice);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/highest available die/i);
  });

  it('enforces bar entry priority when destination is blocked', () => {
    const board = makeEmptyBoard();
    board.whiteBar = 1;
    board.positions[21] = -2; // Black owns entry point for die 3

    const dice = buildDice([3]);
    const moves = BackgammonEngine.calculateAvailableMoves('white', board, dice);

    expect(moves).toHaveLength(0);
  });

  it('prevents bearing off with a higher die while pieces remain behind', () => {
    const board = makeEmptyBoard();
    board.positions[18] = 1; // Checker deeper in home board
    board.positions[22] = 1; // Checker attempting to bear off

    const dice = buildDice([6, 1]);
    const move: Move = {
      from: 22,
      to: 25,
      player: 'white',
      diceUsed: 6
    };

    const validation = BackgammonEngine.validateMove(move, board, dice);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/higher die while pieces remain behind/i);
  });
});
