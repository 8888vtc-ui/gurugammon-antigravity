import { GameService } from '../src/services/gameService';
import { BackgammonEngine } from '../src/services/gameEngine';
import { notificationService } from '../src/services/notificationService';
import { prisma } from '../src/server';
import type { GameState, Move, DiceState, BoardState } from '../src/types/game';
import { defaultCrawfordState } from '../src/services/rules/matchEngine';

jest.mock('../src/server', () => {
  const { prisma } = require('./utils/prismaMock');
  return { prisma };
});

type PrismaMock = {
  game: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  player: {
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

if (!prismaMock.game) {
  prismaMock.game = {
    findUnique: jest.fn(),
    update: jest.fn()
  } as PrismaMock['game'];
}

if (!prismaMock.player) {
  prismaMock.player = {
    update: jest.fn()
  } as PrismaMock['player'];
}

const makeBoard = (): BoardState => {
  const initial = BackgammonEngine.createInitialBoard();
  return {
    positions: [...initial.positions],
    whiteBar: initial.whiteBar,
    blackBar: initial.blackBar,
    whiteOff: initial.whiteOff,
    blackOff: initial.blackOff
  };
};

const makeDice = (override?: Partial<DiceState>): DiceState => ({
  dice: [1, 2],
  used: [false, false],
  doubles: false,
  remaining: [1, 2],
  ...override
});

const baseState = (overrides: Partial<GameState> = {}): GameState => ({
  id: 'game-1',
  player1: {
    id: 'player-1',
    name: 'P1',
    email: 'p1@example.com',
    points: 1000,
    isPremium: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  player2: {
    id: 'player-2',
    name: 'P2',
    email: 'p2@example.com',
    points: 1000,
    isPremium: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  status: 'playing',
  gameType: 'match',
  stake: 0,
  timeControl: null,
  whiteTimeMs: null,
  blackTimeMs: null,
  matchLength: null,
  crawford: defaultCrawfordState(),
  cube: {
    level: 1,
    owner: null,
    isCentered: true,
    doublePending: false,
    doubleOfferedBy: null,
    history: []
  },
  whiteScore: 0,
  blackScore: 0,
  winner: null,
  drawOfferBy: null,
  board: makeBoard(),
  currentPlayer: 'white',
  dice: makeDice(),
  availableMoves: [],
  createdAt: new Date(),
  startedAt: new Date(),
  finishedAt: null,
  ...overrides
});

const mockPrismaGame = {
  id: 1,
  player1Id: 1,
  player2Id: 2,
  status: 'PLAYING',
  gameType: 'match',
  stake: 0,
  player1: { id: 1, name: 'P1', email: 'p1@example.com', points: 1000 },
  player2: { id: 2, name: 'P2', email: 'p2@example.com', points: 1000 },
  winner: null
} as any;

describe('GameService.makeMove regression flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    prismaMock.game.findUnique.mockReset();
    prismaMock.game.update.mockReset();
    prismaMock.player.update.mockReset();
  });

  it('throws when move is not among advertised moves', async () => {
    prismaMock.game.findUnique.mockResolvedValueOnce(mockPrismaGame);
    const legalMoves: Move[] = [{ from: 1, to: 3, player: 'white', diceUsed: 2 }];
    jest.spyOn(GameService, 'loadGameState').mockResolvedValueOnce(baseState({
      availableMoves: legalMoves
    }));

    jest.spyOn(BackgammonEngine, 'calculateAvailableMoves').mockImplementation((player) => {
      if (player === 'white') {
        return legalMoves;
      }
      return [];
    });

    await expect(
      GameService.makeMove(1 as any, 1 as any, { from: 0, to: 1, diceUsed: 1 })
    ).rejects.toThrow('Requested move is not among the available moves');
  });

  it('auto-passes when current player has no legal moves', async () => {
    const startingDice = makeDice({ remaining: [] });
    prismaMock.game.findUnique.mockResolvedValueOnce(mockPrismaGame);
    prismaMock.game.update.mockResolvedValue(mockPrismaGame);

    jest.spyOn(GameService, 'loadGameState').mockResolvedValueOnce(baseState({
      dice: startingDice,
      availableMoves: []
    }));

    const nextDice = makeDice({ dice: [3, 4], remaining: [3, 4] });

    jest.spyOn(BackgammonEngine, 'calculateAvailableMoves').mockImplementation((player) => {
      if (player === 'white') {
        return [];
      }
      return [{ from: 5, to: 2, player: 'black', diceUsed: 3 } as Move];
    });

    jest.spyOn(BackgammonEngine, 'rollDice').mockReturnValueOnce(nextDice);

    const result = await GameService.makeMove(1 as any, 1 as any, { from: 0, to: 1, diceUsed: 1 });

    expect(result.currentPlayer).toBe('black');
    expect(result.dice).toEqual(nextDice);
    expect(result.availableMoves).toEqual([{ from: 5, to: 2, player: 'black', diceUsed: 3 }]);
  });

  it('persists victory and notifies when win condition is met', async () => {
    const victoryBoard = makeBoard();
    victoryBoard.whiteOff = 15;
    const legalMove: Move = { from: 0, to: 1, player: 'white', diceUsed: 1 };

    prismaMock.game.findUnique.mockResolvedValueOnce(mockPrismaGame);
    prismaMock.game.update.mockResolvedValue(mockPrismaGame);
    prismaMock.player.update.mockResolvedValue({
      id: 1,
      name: 'P1',
      email: 'p1@example.com',
      points: 1000
    } as any);

    jest.spyOn(GameService, 'loadGameState').mockResolvedValueOnce(baseState({
      board: victoryBoard,
      dice: makeDice({ remaining: [1] }),
      availableMoves: [legalMove]
    }));

    const calculateSpy = jest.spyOn(BackgammonEngine, 'calculateAvailableMoves').mockImplementation((player) => {
      if (player === 'white') {
        return [legalMove];
      }
      return [];
    });

    jest.spyOn(BackgammonEngine, 'useDie').mockReturnValue(makeDice({ remaining: [] }));
    jest.spyOn(BackgammonEngine, 'applyMove').mockReturnValue(victoryBoard);
    jest.spyOn(BackgammonEngine, 'rollDice').mockReturnValue(makeDice());
    jest.spyOn(BackgammonEngine, 'checkWinCondition').mockReturnValueOnce('white');

    const notifySpy = jest
      .spyOn(notificationService, 'notifyVictory')
      .mockImplementation((userId, params) => ({
        kind: 'victory',
        title: 'Victoire',
        message: 'GG',
        data: {
          gameId: params.gameId,
          opponentId: params.opponentId,
          opponentUsername: params.opponentUsername
        },
        timestamp: new Date().toISOString()
      }) as any);

    const result = await GameService.makeMove(1 as any, 1 as any, legalMove);

    expect(result.status).toBe('finished');
    expect(calculateSpy).toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledWith(1, expect.any(Object));
  });
});
