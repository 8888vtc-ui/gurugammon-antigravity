// src/services/gameService.ts
// @ts-nocheck - Désactiver les vérifications strictes pour le service de jeu
import { prisma } from '../server';
import { BackgammonEngine } from './gameEngine';
import { convertPrismaPlayer } from '../utils/playerUtils';
import {
  GameState,
  BoardState,
  DiceState,
  Move,
  PlayerColor,
  MakeMoveRequest,
  CubeSnapshot,
  GameSummary,
  TimeControlConfig
} from '../types/game';
import { notificationService } from './notificationService';
import { TurnTimerService } from './turnTimerService';
import { config } from '../config';
import type { games, matches, Player, Prisma } from '@prisma/client';
import {
  applyCubeAction as resolveCubeAction,
  type CubeAction,
  type CubeHistoryEntry,
  type CubeContext
} from './rules/cubeLogic';
import {
  defaultCrawfordState,
  evaluateCrawfordState,
  type CrawfordState,
  type MatchRecord,
  type MatchRulesOptions
} from './rules/matchEngine';

type MoveOutcome = {
  board: BoardState;
  dice: DiceState;
  nextPlayer: PlayerColor;
  availableMoves: Move[];
};

const switchPlayer = (player: PlayerColor): PlayerColor => (player === 'white' ? 'black' : 'white');

const defaultCubeSnapshot = (): CubeSnapshot => ({
  level: 1,
  owner: null,
  isCentered: true,
  doublePending: false,
  doubleOfferedBy: null,
  history: []
});

const summarizeGameState = (state: GameState): GameSummary => ({
  id: state.id,
  status: state.status,
  currentPlayer: state.currentPlayer,
  cube: state.cube,
  crawford: state.crawford,
  matchLength: state.matchLength,
  whiteScore: state.whiteScore,
  blackScore: state.blackScore
});

const DEFAULT_MATCH_RULES: MatchRulesOptions = {
  crawford: true,
  jacoby: false,
  beaver: true,
  raccoon: true
};

const playerEnumToColor = (owner: Player | null | undefined): PlayerColor | null => {
  if (owner === 'WHITE') {
    return 'white';
  }
  if (owner === 'BLACK') {
    return 'black';
  }
  return null;
};

const colorToPlayerEnum = (color: PlayerColor | null): Player | null => {
  if (color === 'white') {
    return 'WHITE';
  }
  if (color === 'black') {
    return 'BLACK';
  }
  return null;
};

const parseCubeHistory = (raw: Prisma.JsonValue | null | undefined): CubeHistoryEntry[] => {
  if (!raw) {
    return [];
  }

  try {
    if (Array.isArray(raw)) {
      return raw as CubeHistoryEntry[];
    }

    if (typeof raw === 'string') {
      return JSON.parse(raw) as CubeHistoryEntry[];
    }

    return JSON.parse(JSON.stringify(raw)) as CubeHistoryEntry[];
  } catch {
    return [];
  }
};

const serializeCubeHistory = (history: CubeHistoryEntry[]): Prisma.JsonValue => history as unknown as Prisma.JsonValue;

const parseMatchRules = (rules: Prisma.JsonValue | null | undefined): MatchRulesOptions => {
  if (!rules) {
    return DEFAULT_MATCH_RULES;
  }

  try {
    const normalized = typeof rules === 'string' ? JSON.parse(rules) : JSON.parse(JSON.stringify(rules));
    return {
      crawford: normalized.crawford ?? DEFAULT_MATCH_RULES.crawford,
      jacoby: normalized.jacoby ?? DEFAULT_MATCH_RULES.jacoby,
      beaver: normalized.beaver ?? DEFAULT_MATCH_RULES.beaver,
      raccoon: normalized.raccoon ?? DEFAULT_MATCH_RULES.raccoon
    } satisfies MatchRulesOptions;
  } catch {
    return DEFAULT_MATCH_RULES;
  }
};

const serializeMatchRules = (rules: MatchRulesOptions): Prisma.JsonValue => rules as unknown as Prisma.JsonValue;

const buildMatchRecord = (match: matches | null): MatchRecord | null => {
  if (!match) {
    return null;
  }

  const rules = parseMatchRules(match.rules as Prisma.JsonValue);

  return {
    id: match.id,
    gameId: match.gameId,
    length: match.length,
    rules,
    state: match.state,
    crawfordUsed: match.crawfordUsed,
    cubeHistory: parseCubeHistory(match.cubeHistory as Prisma.JsonValue)
  } satisfies MatchRecord;
};

const buildCubeSnapshot = (game: games): CubeSnapshot => {
  const owner = playerEnumToColor(game.cubeOwner ?? null);
  return {
    level: game.cubeLevel ?? 1,
    owner,
    isCentered: owner === null,
    doublePending: Boolean(game.doublePending),
    doubleOfferedBy: game.doubleOfferedBy === 'white' || game.doubleOfferedBy === 'black' ? game.doubleOfferedBy : null,
    history: parseCubeHistory(game.cubeHistory as Prisma.JsonValue)
  } satisfies CubeSnapshot;
};

const buildCrawfordState = (
  game: games,
  match: MatchRecord | null,
  rules: MatchRulesOptions,
  meta?: PersistedSnapshotMeta
): CrawfordState => {
  const matchLengthOverride = meta ? meta.matchLength : undefined;
  const resolvedMatchLength =
    typeof matchLengthOverride !== 'undefined'
      ? matchLengthOverride
      : game.matchLength ?? match?.length ?? null;

  if (!rules.crawford) {
    const base = defaultCrawfordState();
    return {
      ...base,
      enabled: false,
      used: match?.crawfordUsed ?? false,
      matchLength: resolvedMatchLength,
      oneAwayScore: resolvedMatchLength !== null ? resolvedMatchLength - 1 : null
    } satisfies CrawfordState;
  }

  return evaluateCrawfordState({
    rules,
    matchLength: resolvedMatchLength,
    whiteScore: game.whiteScore ?? 0,
    blackScore: game.blackScore ?? 0,
    match
  });
};

const shouldRollNewDice = (dice: DiceState) => dice.remaining.length === 0;

const applyTimerSnapshot = (gameId: number, state: GameState, fallback?: {
  preset?: string | null;
  whiteRemainingMs: number | null;
  blackRemainingMs: number | null;
}): GameState => {
  const snapshot = TurnTimerService.getSnapshot(gameId);

  if (snapshot) {
    return {
      ...state,
      timeControl: snapshot.config.preset,
      whiteTimeMs: snapshot.whiteRemainingMs,
      blackTimeMs: snapshot.blackRemainingMs
    };
  }

  if (fallback) {
    return {
      ...state,
      timeControl: fallback.preset ?? state.timeControl ?? null,
      whiteTimeMs: fallback.whiteRemainingMs,
      blackTimeMs: fallback.blackRemainingMs
    };
  }

  return {
    ...state,
    timeControl: state.timeControl ?? null,
    whiteTimeMs: state.whiteTimeMs ?? null,
    blackTimeMs: state.blackTimeMs ?? null
  };
};

const determineNextTurn = (
  board: BoardState,
  currentPlayer: PlayerColor,
  dice: DiceState,
  forceSwitch: boolean
): MoveOutcome => {
  const currentMoves = BackgammonEngine.calculateAvailableMoves(currentPlayer, board, dice);

  if (!forceSwitch && dice.remaining.length > 0 && currentMoves.length > 0) {
    return {
      board,
      dice,
      nextPlayer: currentPlayer,
      availableMoves: currentMoves
    };
  }

  let nextPlayer = switchPlayer(currentPlayer);
  let nextDice = BackgammonEngine.rollDice();
  let nextMoves = BackgammonEngine.calculateAvailableMoves(nextPlayer, board, nextDice);
  let safetyCounter = 0;

  while (nextMoves.length === 0 && safetyCounter < 6) {
    safetyCounter += 1;
    nextPlayer = switchPlayer(nextPlayer);
    nextDice = BackgammonEngine.rollDice();
    nextMoves = BackgammonEngine.calculateAvailableMoves(nextPlayer, board, nextDice);
  }

  return {
    board,
    dice: nextDice,
    nextPlayer,
    availableMoves: nextMoves
  };
};

type PersistedTimerMeta = {
  active: PlayerColor | null;
  whiteTimeMs: number | null;
  blackTimeMs: number | null;
  paused?: boolean;
  updatedAt?: string;
};

type PersistedSnapshotMeta = {
  matchLength: number | null;
  crawford: CrawfordState;
  timers?: PersistedTimerMeta;
};

type PersistedSnapshot = {
  board: BoardState;
  dice: DiceState;
  meta?: PersistedSnapshotMeta;
};

const serializeSnapshot = (snapshot: PersistedSnapshot) => {
  const payload: Record<string, unknown> = {
    board: {
      positions: snapshot.board.positions,
      whiteBar: snapshot.board.whiteBar,
      blackBar: snapshot.board.blackBar,
      whiteOff: snapshot.board.whiteOff,
      blackOff: snapshot.board.blackOff
    },
    dice: {
      dice: [...snapshot.dice.dice],
      used: [...snapshot.dice.used],
      remaining: [...snapshot.dice.remaining],
      doubles: snapshot.dice.doubles
    }
  };

  if (snapshot.meta) {
    const timers = snapshot.meta.timers
      ? {
          active: snapshot.meta.timers.active,
          whiteTimeMs: snapshot.meta.timers.whiteTimeMs,
          blackTimeMs: snapshot.meta.timers.blackTimeMs,
          ...(typeof snapshot.meta.timers.paused === 'boolean' ? { paused: snapshot.meta.timers.paused } : {}),
          ...(snapshot.meta.timers.updatedAt ? { updatedAt: snapshot.meta.timers.updatedAt } : {})
        }
      : undefined;

    payload.meta = {
      matchLength: snapshot.meta.matchLength ?? null,
      crawford: snapshot.meta.crawford ?? defaultCrawfordState(),
      ...(timers
        ? {
            timers: {
              active: snapshot.meta.timers.active,
              whiteTimeMs: snapshot.meta.timers.whiteTimeMs,
              blackTimeMs: snapshot.meta.timers.blackTimeMs,
              ...(typeof snapshot.meta.timers.paused === 'boolean' ? { paused: snapshot.meta.timers.paused } : {}),
              ...(snapshot.meta.timers.updatedAt ? { updatedAt: snapshot.meta.timers.updatedAt } : {})
            }
          }
        : {})
    } satisfies PersistedSnapshotMeta;
  }

  return payload;
};

const deserializeSnapshot = (payload: unknown): PersistedSnapshot => {
  const baseBoard = BackgammonEngine.createInitialBoard();
  const baseDice = BackgammonEngine.rollDice();

  if (!payload || typeof payload !== 'object') {
    return { board: baseBoard, dice: baseDice };
  }

  const { board: rawBoard, dice: rawDice, meta: rawMeta } = payload as Record<string, unknown>;

  const board: BoardState = {
    positions:
      rawBoard && typeof rawBoard === 'object' && Array.isArray((rawBoard as any).positions) && (rawBoard as any).positions.length === 24
        ? (rawBoard as any).positions.map((value: unknown) => (typeof value === 'number' ? value : 0))
        : baseBoard.positions,
    whiteBar:
      rawBoard && typeof rawBoard === 'object' && typeof (rawBoard as any).whiteBar === 'number'
        ? (rawBoard as any).whiteBar
        : baseBoard.whiteBar,
    blackBar:
      rawBoard && typeof rawBoard === 'object' && typeof (rawBoard as any).blackBar === 'number'
        ? (rawBoard as any).blackBar
        : baseBoard.blackBar,
    whiteOff:
      rawBoard && typeof rawBoard === 'object' && typeof (rawBoard as any).whiteOff === 'number'
        ? (rawBoard as any).whiteOff
        : baseBoard.whiteOff,
    blackOff:
      rawBoard && typeof rawBoard === 'object' && typeof (rawBoard as any).blackOff === 'number'
        ? (rawBoard as any).blackOff
        : baseBoard.blackOff
  };

  const dice: DiceState = {
    dice:
      rawDice && typeof rawDice === 'object' && Array.isArray((rawDice as any).dice) && (rawDice as any).dice.length === 2
        ? (rawDice as any).dice.map((value: unknown) => (typeof value === 'number' ? value : 0)) as [number, number]
        : baseDice.dice,
    used:
      rawDice && typeof rawDice === 'object' && Array.isArray((rawDice as any).used)
        ? (rawDice as any).used.map(flag => Boolean(flag)).slice(0, 2)
        : baseDice.used,
    remaining:
      rawDice && typeof rawDice === 'object' && Array.isArray((rawDice as any).remaining)
        ? (rawDice as any).remaining.filter((value: unknown): value is number => typeof value === 'number')
        : baseDice.remaining,
    doubles:
      rawDice && typeof rawDice === 'object' && typeof (rawDice as any).doubles === 'boolean'
        ? (rawDice as any).doubles
        : baseDice.doubles
  };
  let meta: PersistedSnapshotMeta | undefined;
  if (rawMeta && typeof rawMeta === 'object') {
    const candidate = rawMeta as { matchLength?: unknown; crawford?: unknown; timers?: unknown };
    const matchLength =
      typeof candidate.matchLength === 'number'
        ? candidate.matchLength
        : candidate.matchLength === null
        ? null
        : null;

    let crawford = defaultCrawfordState();
    if (candidate.crawford && typeof candidate.crawford === 'object') {
      const input = candidate.crawford as Partial<CrawfordState>;
      crawford = {
        ...defaultCrawfordState(),
        enabled: typeof input.enabled === 'boolean' ? input.enabled : defaultCrawfordState().enabled,
        active: typeof input.active === 'boolean' ? input.active : defaultCrawfordState().active,
        used: typeof input.used === 'boolean' ? input.used : defaultCrawfordState().used,
        matchLength:
          typeof input.matchLength === 'number'
            ? input.matchLength
            : input.matchLength === null
            ? null
            : defaultCrawfordState().matchLength,
        oneAwayScore:
          typeof input.oneAwayScore === 'number'
            ? input.oneAwayScore
            : input.oneAwayScore === null
            ? null
            : defaultCrawfordState().oneAwayScore,
        triggeredBy:
          input.triggeredBy === 'white' || input.triggeredBy === 'black' ? input.triggeredBy : null
      } satisfies CrawfordState;
    }

    let timers: PersistedTimerMeta | undefined;
    if (candidate.timers && typeof candidate.timers === 'object') {
      const timersInput = candidate.timers as Partial<PersistedTimerMeta> & Record<string, unknown>;
      const active = timersInput.active === 'white' || timersInput.active === 'black' ? timersInput.active : null;
      const white = typeof timersInput.whiteTimeMs === 'number' ? timersInput.whiteTimeMs : timersInput.whiteTimeMs === null ? null : null;
      const black = typeof timersInput.blackTimeMs === 'number' ? timersInput.blackTimeMs : timersInput.blackTimeMs === null ? null : null;
      const paused = typeof timersInput.paused === 'boolean' ? timersInput.paused : undefined;
      const updatedAt = typeof timersInput.updatedAt === 'string' ? timersInput.updatedAt : undefined;

      timers = {
        active,
        whiteTimeMs: white,
        blackTimeMs: black,
        ...(typeof paused === 'boolean' ? { paused } : {}),
        ...(updatedAt ? { updatedAt } : {})
      } satisfies PersistedTimerMeta;
    }

    meta = timers ? { matchLength, crawford, timers } satisfies PersistedSnapshotMeta : { matchLength, crawford } satisfies PersistedSnapshotMeta;
  }

  return meta ? { board, dice, meta } : { board, dice };
};

const persistGameSnapshot = async (
  gameId: string,
  snapshot: {
    board: BoardState;
    dice: DiceState;
    currentPlayer: PlayerColor;
    status?: string;
    cube?: {
      level: number;
      owner: PlayerColor | null;
      doublePending: boolean;
      doubleOfferedBy: PlayerColor | null;
      history: CubeHistoryEntry[];
    };
    crawford?: CrawfordState;
    matchLength?: number | null;
  }
) => {
  const cubeData = snapshot.cube;
  const cubeOwnerEnum = cubeData ? colorToPlayerEnum(cubeData.owner) : null;
  const cubeOfferedBy = cubeData?.doubleOfferedBy ?? null;

  const timerSnapshot = TurnTimerService.getSnapshot(Number(gameId));
  const timers: PersistedTimerMeta | undefined = timerSnapshot
    ? {
        active: timerSnapshot.paused ? null : timerSnapshot.active,
        whiteTimeMs: timerSnapshot.whiteRemainingMs,
        blackTimeMs: timerSnapshot.blackRemainingMs,
        paused: timerSnapshot.paused,
        updatedAt: new Date().toISOString()
      }
    : snapshot.crawford || typeof snapshot.matchLength !== 'undefined'
    ? snapshot.crawford && snapshot.crawford.matchLength !== undefined
      ? undefined
      : undefined
    : undefined;

  const meta =
    snapshot.crawford || typeof snapshot.matchLength !== 'undefined' || timers
      ? {
          matchLength: typeof snapshot.matchLength !== 'undefined' ? snapshot.matchLength : null,
          crawford: snapshot.crawford ?? defaultCrawfordState(),
          ...(timers ? { timers } : {})
        }
      : undefined;

  await prisma.game.update({
    where: { id: gameId },
    data: {
      boardState: serializeSnapshot({
        board: snapshot.board,
        dice: snapshot.dice,
        ...(meta ? { meta } : {})
      }),
      dice: [...snapshot.dice.dice],
      currentPlayer: snapshot.currentPlayer === 'white' ? 'WHITE' : 'BLACK',
      status: snapshot.status ? snapshot.status.toUpperCase() : undefined,
      ...(cubeData
        ? {
            cubeLevel: cubeData.level,
            cubeOwner: cubeOwnerEnum,
            doublePending: cubeData.doublePending,
            doubleOfferedBy: cubeOfferedBy,
            cubeHistory: serializeCubeHistory(cubeData.history)
          }
        : {})
    }
  });
};

export class GameService {

  // Créer un nouvel état de jeu
  static async createGameState(player1Id: number, gameType: string, stake: number): Promise<GameState> {
    const player1 = await prisma.player.findUnique({
      where: { id: player1Id },
      select: { id: true, name: true, email: true, points: true }
    });

    if (!player1) {
      throw new Error('Player not found');
    }

    // Créer l'état de jeu initial et persister
    const initialBoard = BackgammonEngine.createInitialBoard();
    const initialDice = BackgammonEngine.rollDice();

    const defaultTimeControl = config.timeControl;

    const prismaGame = await prisma.game.create({
      data: {
        player1Id,
        gameType,
        stake,
        status: 'WAITING',
        currentPlayer: 'WHITE',
        boardState: serializeSnapshot({ board: initialBoard, dice: initialDice }),
        dice: [...initialDice.dice],
        timeControlPreset: defaultTimeControl.preset,
        timeControlTotalMs: defaultTimeControl.totalTimeMs,
        timeControlIncrementMs: defaultTimeControl.incrementMs,
        timeControlDelayMs: defaultTimeControl.delayMs,
        whiteTimeRemainingMs: defaultTimeControl.totalTimeMs,
        blackTimeRemainingMs: defaultTimeControl.totalTimeMs,
        cubeLevel: 1,
        cubeOwner: null,
        doublePending: false,
        doubleOfferedBy: null,
        cubeHistory: []
      }
    });

    TurnTimerService.configure(prismaGame.id, defaultTimeControl.preset, {
      totalTimeMs: defaultTimeControl.totalTimeMs,
      incrementMs: defaultTimeControl.incrementMs,
      delayMs: defaultTimeControl.delayMs
    });

    // Créer un objet Player complet
    const fullPlayer1 = convertPrismaPlayer(player1);

    return {
      id: prismaGame.id.toString(),
      player1: fullPlayer1,
      player2: null,
      status: 'waiting',
      gameType: gameType as any,
      stake,
      winner: null,
      timeControl: defaultTimeControl.preset,
      whiteTimeMs: defaultTimeControl.totalTimeMs,
      blackTimeMs: defaultTimeControl.totalTimeMs,
      matchLength: prismaGame.matchLength ?? null,
      crawford: defaultCrawfordState(),
      cube: defaultCubeSnapshot(),
      board: initialBoard,
      currentPlayer: 'white',
      dice: initialDice,
      availableMoves: BackgammonEngine.calculateAvailableMoves('white', initialBoard, initialDice),
      createdAt: prismaGame.createdAt,
      startedAt: null,
      finishedAt: null
    };
  }

  // Démarrer une partie (quand le deuxième joueur rejoint)
  static async startGame(gameId: number, player2Id: number): Promise<GameState> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: { select: { id: true, name: true, email: true, points: true } },
        player2: { select: { id: true, name: true, email: true, points: true } }
      }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'waiting') {
      throw new Error('Game is not in waiting status');
    }

    const player2 = await prisma.player.findUnique({
      where: { id: player2Id },
      select: { id: true, name: true, email: true, points: true }
    });

    if (!player2) {
      throw new Error('Player2 not found');
    }

    // Mettre à jour la partie en base
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        player2Id,
        status: 'playing',
        startedAt: new Date()
      },
      include: {
        player1: { select: { id: true, name: true, email: true, points: true } },
        player2: { select: { id: true, name: true, email: true, points: true } }
      }
    });

    const snapshot = deserializeSnapshot(game.boardState);

    const snapshotMatchLength = typeof snapshot.meta?.matchLength !== 'undefined'
      ? snapshot.meta?.matchLength
      : game.matchLength ?? null;
    const snapshotCrawford = snapshot.meta?.crawford ?? defaultCrawfordState();

    await persistGameSnapshot(String(gameId), {
      board: snapshot.board,
      dice: snapshot.dice,
      currentPlayer: 'white',
      status: 'PLAYING',
      cube: buildCubeSnapshot(game),
      matchLength: snapshotMatchLength,
      crawford: snapshotCrawford
    });

    const nextState = await this.loadGameState(gameId);

    if (!nextState) {
      throw new Error('Failed to start game');
    }

    TurnTimerService.ensure(gameId, game.timeControlPreset ?? defaultTimeControl.preset);

    return applyTimerSnapshot(gameId, {
      ...nextState,
      player1: convertPrismaPlayer(updatedGame.player1),
      player2: updatedGame.player2 ? convertPrismaPlayer(updatedGame.player2) : null,
      startedAt: updatedGame.startedAt
    });
  }

  // Charger l'état d'une partie depuis la base
  static async loadGameState(gameId: number): Promise<GameState | null> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: { select: { id: true, name: true, email: true, points: true } },
        player2: { select: { id: true, name: true, email: true, points: true } },
        winner: { select: { id: true, name: true, email: true, points: true } },
        match: true
      }
    });

    if (!game) {
      return null;
    }

    const snapshot = deserializeSnapshot(game.boardState);

    const timerMeta = snapshot.meta?.timers;
    const timerOverrides: Partial<TimeControlConfig> = {};
    if (typeof game.timeControlTotalMs === 'number') {
      timerOverrides.totalTimeMs = game.timeControlTotalMs;
    }
    if (typeof game.timeControlIncrementMs === 'number') {
      timerOverrides.incrementMs = game.timeControlIncrementMs;
    }
    if (typeof game.timeControlDelayMs === 'number') {
      timerOverrides.delayMs = game.timeControlDelayMs;
    }

    const resolvedActiveTimer: PlayerColor | null = game.activeTimer === 'WHITE'
      ? 'white'
      : game.activeTimer === 'BLACK'
      ? 'black'
      : timerMeta?.active ?? null;

    TurnTimerService.restore(gameId, {
      preset: game.timeControlPreset ?? null,
      whiteRemainingMs: game.whiteTimeRemainingMs ?? timerMeta?.whiteTimeMs ?? null,
      blackRemainingMs: game.blackTimeRemainingMs ?? timerMeta?.blackTimeMs ?? null,
      activePlayer: resolvedActiveTimer,
      lastUpdatedAt: game.timerUpdatedAt ?? (timerMeta?.updatedAt ? new Date(timerMeta.updatedAt) : null),
      overrides: timerOverrides
    });

    const matchRecord = buildMatchRecord(game.match ?? null);
    const rules = matchRecord?.rules ?? DEFAULT_MATCH_RULES;

    const resolvedMatchLength = snapshot.meta?.matchLength ?? game.matchLength ?? matchRecord?.length ?? null;
    const crawfordState = buildCrawfordState(game as games, matchRecord, rules, snapshot.meta);

    const diceFromColumn = Array.isArray(game.dice) && game.dice.length === 2
      ? (game.dice.map(value => (typeof value === 'number' ? value : 0)) as [number, number])
      : snapshot.dice.dice;

    const mergedDice: DiceState = {
      ...snapshot.dice,
      dice: diceFromColumn
    };

    const currentPlayer = (game.currentPlayer ?? 'WHITE').toLowerCase() as PlayerColor;
    const availableMoves = BackgammonEngine.calculateAvailableMoves(currentPlayer, snapshot.board, mergedDice);

    const stateWithTimers = applyTimerSnapshot(gameId, {
      id: game.id.toString(),
      player1: convertPrismaPlayer(game.player1),
      player2: game.player2 ? convertPrismaPlayer(game.player2) : null,
      status: game.status as any,
      gameType: game.gameMode as any,
      stake: game.stake,
      winner: game.winner ? convertPrismaPlayer(game.winner) : null,
      board: snapshot.board,
      currentPlayer,
      dice: mergedDice,
      availableMoves,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      timeControl: game.timeControlPreset ?? null,
      whiteTimeMs: game.whiteTimeRemainingMs ?? timerMeta?.whiteTimeMs ?? null,
      blackTimeMs: game.blackTimeRemainingMs ?? timerMeta?.blackTimeMs ?? null,
      matchLength: resolvedMatchLength,
      crawford: crawfordState,
      cube: buildCubeSnapshot(game)
    }, {
      preset: game.timeControlPreset ?? null,
      whiteRemainingMs: game.whiteTimeRemainingMs ?? timerMeta?.whiteTimeMs ?? null,
      blackRemainingMs: game.blackTimeRemainingMs ?? timerMeta?.blackTimeMs ?? null
    });

    return stateWithTimers;
  }

  // Faire un mouvement
  static async makeMove(gameId: number, playerId: number, moveRequest: MakeMoveRequest): Promise<GameState> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: { select: { id: true, name: true, email: true, points: true } },
        player2: { select: { id: true, name: true, email: true, points: true } },
        winner: { select: { id: true, name: true, email: true, points: true } }
      }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    const normalizedStatus = String(game.status ?? '').toLowerCase();
    if (normalizedStatus !== 'playing') {
      throw new Error('Game is not in playing status');
    }

    // Déterminer la couleur du joueur
    const playerColor = game.player1Id === playerId ? 'white' : 'black';
    const currentPlayer = game.player1Id === playerId ? game.player1 : game.player2;

    if (!currentPlayer) {
      throw new Error('Player not in game');
    }

    const baseState = await this.loadGameState(gameId);
    if (!baseState) {
      throw new Error('Game state not found');
    }

    const currentState = applyTimerSnapshot(gameId, baseState);

    // Vérifier que c'est le tour du joueur
    if (currentState.currentPlayer !== playerColor) {
      throw new Error('Not your turn');
    }

    const timerConsumption = TurnTimerService.consume(gameId, currentState.currentPlayer);

    if (timerConsumption && timerConsumption.flagFall) {
      const losingColor = timerConsumption.flagFall;
      const winningColor = losingColor === 'white' ? 'black' : 'white';
      const winnerPlayer = winningColor === 'white' ? game.player1 : game.player2;
      const loserPlayer = winningColor === 'white' ? game.player2 : game.player1;

      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'FINISHED',
          winnerId: winnerPlayer?.id ?? null,
          finishedAt: new Date()
        }
      });

      if (winnerPlayer) {
        notificationService.notifyVictory(winnerPlayer.id, {
          gameId: String(gameId),
          opponentId: loserPlayer?.id ?? null,
          opponentUsername: (loserPlayer?.name ?? loserPlayer?.email) ?? null
        });
      }

      const finalState = applyTimerSnapshot(gameId, {
        ...currentState,
        status: 'finished',
        winner: winnerPlayer ? convertPrismaPlayer(winnerPlayer) : null,
        finishedAt: new Date(),
        availableMoves: [],
        currentPlayer: winningColor,
        dice: currentState.dice
      }, {
        preset: currentState.timeControl,
        whiteRemainingMs: timerConsumption.whiteRemainingMs,
        blackRemainingMs: timerConsumption.blackRemainingMs
      });

      TurnTimerService.clear(gameId);

      return finalState;
    }

    const legalMoves = BackgammonEngine.calculateAvailableMoves(
      currentState.currentPlayer,
      currentState.board,
      currentState.dice
    );

    if (legalMoves.length === 0) {
      const outcome = determineNextTurn(currentState.board, currentState.currentPlayer, currentState.dice, true);

      await persistGameSnapshot(String(gameId), {
        board: outcome.board,
        dice: outcome.dice,
        currentPlayer: outcome.nextPlayer,
        status: game.status,
        cube: currentState.cube,
        matchLength: currentState.matchLength,
        crawford: currentState.crawford
      });

      TurnTimerService.completeMove(gameId, currentState.currentPlayer, outcome.nextPlayer);

      return applyTimerSnapshot(gameId, {
        ...currentState,
        board: outcome.board,
        currentPlayer: outcome.nextPlayer,
        dice: outcome.dice,
        availableMoves: outcome.availableMoves
      });
    }

    // Créer l'objet mouvement
    const move: Move = {
      from: moveRequest.from,
      to: moveRequest.to,
      player: playerColor,
      diceUsed: moveRequest.diceUsed
    };

    const moveAllowed = legalMoves.some(
      candidate =>
        candidate.from === move.from &&
        candidate.to === move.to &&
        candidate.diceUsed === move.diceUsed
    );

    if (!moveAllowed) {
      throw new Error('Requested move is not among the available moves');
    }

    // Valider le mouvement
    const validation = BackgammonEngine.validateMove(move, currentState.board, currentState.dice);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid move');
    }

    // Appliquer le mouvement
    const newBoard = BackgammonEngine.applyMove(move, currentState.board);
    const newDice = BackgammonEngine.useDie(move.diceUsed, currentState.dice);

    const nextPlayer = currentState.currentPlayer === 'white' ? 'black' : 'white';
    const shouldRoll = shouldRollNewDice(newDice);
    const outcome = determineNextTurn(newBoard, nextPlayer, newDice, shouldRoll);

    if (shouldRoll) {
      TurnTimerService.completeMove(gameId, currentState.currentPlayer, outcome.nextPlayer);
    }

    // Vérifier la condition de victoire
    const winnerColor = BackgammonEngine.checkWinCondition(newBoard);

    if (winnerColor) {
      // Terminer la partie
      const winnerPlayer = winnerColor === 'white' ? game.player1 : game.player2;
      const loserPlayer = winnerColor === 'white' ? game.player2 : game.player1;

      // Mettre à jour les points
      if (winnerPlayer && loserPlayer) {
        await prisma.player.update({
          where: { id: winnerPlayer.id },
          data: { points: { increment: game.stake } }
        });

        await prisma.player.update({
          where: { id: loserPlayer.id },
          data: { points: { decrement: game.stake } }
        });
      }

      await persistGameSnapshot(String(gameId), {
        board: newBoard,
        dice: outcome.dice,
        currentPlayer: outcome.nextPlayer,
        status: 'FINISHED',
        cube: currentState.cube,
        matchLength: currentState.matchLength,
        crawford: currentState.crawford
      });

      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'FINISHED',
          winnerId: winnerPlayer?.id,
          finishedAt: new Date()
        }
      });

      if (winnerPlayer) {
        notificationService.notifyVictory(winnerPlayer.id, {
          gameId: String(gameId),
          opponentId: loserPlayer?.id ?? null,
          opponentUsername: (loserPlayer?.name ?? loserPlayer?.email) ?? null
        });
      }

      const finishedState = applyTimerSnapshot(gameId, {
        ...currentState,
        board: newBoard,
        currentPlayer: outcome.nextPlayer,
        dice: outcome.dice,
        availableMoves: [],
        status: 'finished',
        winner: winnerPlayer,
        finishedAt: new Date()
      });

      TurnTimerService.clear(gameId);

      return finishedState;
    }

    await persistGameSnapshot(String(gameId), {
      board: outcome.board,
      dice: outcome.dice,
      currentPlayer: outcome.nextPlayer,
      status: game.status,
      cube: currentState.cube,
      matchLength: currentState.matchLength,
      crawford: currentState.crawford
    });

    TurnTimerService.completeMove(gameId, currentState.currentPlayer, outcome.nextPlayer);

    return applyTimerSnapshot(gameId, {
      ...currentState,
      board: outcome.board,
      currentPlayer: outcome.nextPlayer,
      dice: outcome.dice,
      availableMoves: outcome.availableMoves
    });
  }

  static async applyCubeAction(gameId: number, playerId: string | number, action: CubeAction): Promise<GameState> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: { select: { id: true, name: true, email: true, points: true } },
        player2: { select: { id: true, name: true, email: true, points: true } },
        match: true
      }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    const status = String(game.status ?? '').toLowerCase();
    if (status !== 'playing') {
      throw new Error('Cube actions only allowed during active games');
    }

    const playerKey = String(playerId);
    const isPlayer1 = String(game.player1Id) === playerKey;
    const isPlayer2 = String(game.player2Id ?? '') === playerKey;

    if (!isPlayer1 && !isPlayer2) {
      throw new Error('Player not part of this game');
    }

    const playerColor: PlayerColor = isPlayer1 ? 'white' : 'black';

    if ((action === 'double' || action === 'redouble') && (game.currentPlayer ?? 'WHITE').toLowerCase() !== playerColor) {
      throw new Error('Only the current player may offer a double');
    }

    const cubeSnapshot = buildCubeSnapshot(game);
    const persistedSnapshot = deserializeSnapshot(game.boardState);
    const persistedCurrentPlayer = (game.currentPlayer ?? 'WHITE').toLowerCase() as PlayerColor;
    const matchRecord = buildMatchRecord(game.match ?? null);
    const rules = matchRecord?.rules ?? DEFAULT_MATCH_RULES;
    const opponentColor: PlayerColor = playerColor === 'white' ? 'black' : 'white';

    if ((action === 'take' || action === 'pass' || action === 'beaver' || action === 'raccoon') && cubeSnapshot.doubleOfferedBy === null) {
      throw new Error('No double is pending');
    }

    if ((action === 'take' || action === 'pass') && cubeSnapshot.doubleOfferedBy === playerColor) {
      throw new Error('Offering player cannot respond to their own double');
    }

    const context: CubeContext = {
      currentPlayer: playerColor,
      cube: {
        level: cubeSnapshot.level,
        owner: cubeSnapshot.owner,
        isCentered: cubeSnapshot.isCentered
      },
      matchLength: game.matchLength ?? matchRecord?.length ?? null,
      whiteScore: game.whiteScore,
      blackScore: game.blackScore,
      rules,
      doublePending: cubeSnapshot.doublePending,
      doubleOfferedBy: cubeSnapshot.doubleOfferedBy,
      match: matchRecord,
      game: game as games
    };

    const result = resolveCubeAction(context, action);
    const updatedHistory = [...cubeSnapshot.history, result.historyEntry];

    const snapshotMatchLengthOverride = typeof persistedSnapshot.meta?.matchLength !== 'undefined'
      ? persistedSnapshot.meta.matchLength
      : undefined;
    const resolvedMatchLength = typeof snapshotMatchLengthOverride !== 'undefined'
      ? snapshotMatchLengthOverride
      : game.matchLength ?? matchRecord?.length ?? null;

    const gameUpdate: Prisma.gamesUpdateInput = {
      cubeLevel: result.cube.level,
      cubeOwner: colorToPlayerEnum(result.cube.owner),
      doublePending: result.doublePending,
      doubleOfferedBy: result.doubleOfferedBy,
      cubeHistory: serializeCubeHistory(updatedHistory)
    };

    gameUpdate.matchLength = resolvedMatchLength;

    let matchHistoryUpdate: CubeHistoryEntry[] | null = null;
    if (matchRecord) {
      matchHistoryUpdate = [...matchRecord.cubeHistory, result.historyEntry];
    }

    if (result.matchUpdate) {
      gameUpdate.whiteScore = result.matchUpdate.game.whiteScore;
      gameUpdate.blackScore = result.matchUpdate.game.blackScore;
      gameUpdate.doublePending = result.matchUpdate.game.doublePending;
      gameUpdate.doubleOfferedBy = result.matchUpdate.game.doubleOfferedBy;
      gameUpdate.cubeOwner = result.matchUpdate.game.cubeOwner;

      if (result.matchUpdate.finished) {
        gameUpdate.status = 'FINISHED';
        gameUpdate.finishedAt = new Date();
        const winnerEnum = result.matchUpdate.game.cubeOwner ?? null;
        if (winnerEnum) {
          gameUpdate.winner = winnerEnum;
          const winnerId = winnerEnum === 'WHITE' ? game.player1Id : game.player2Id;
          if (winnerId) {
            gameUpdate.winnerId = winnerId;
          }
        }
      }
    }

    let nextCurrentPlayerColor: PlayerColor = persistedCurrentPlayer;
    if (result.matchUpdate?.finished) {
      nextCurrentPlayerColor = persistedCurrentPlayer;
    } else if (result.doublePending) {
      nextCurrentPlayerColor = opponentColor;
    } else if (action === 'take' || action === 'pass') {
      nextCurrentPlayerColor = opponentColor;
    }

    gameUpdate.currentPlayer = nextCurrentPlayerColor === 'white' ? 'WHITE' : 'BLACK';

    await prisma.game.update({
      where: { id: gameId },
      data: gameUpdate
    });

    if (matchRecord) {
      const matchUpdateData: Prisma.matchesUpdateInput = {
        cubeHistory: serializeCubeHistory(matchHistoryUpdate ?? matchRecord.cubeHistory)
      };

      if (result.matchUpdate?.match) {
        matchUpdateData.state = result.matchUpdate.match.state;
        matchUpdateData.crawfordUsed = result.matchUpdate.match.crawfordUsed;
      }

      await prisma.matches.update({
        where: { id: matchRecord.id },
        data: matchUpdateData
      });
    }

    const snapshotStatus = result.matchUpdate?.finished ? 'FINISHED' : game.status;

    const nextMatchRecord: MatchRecord | null = (() => {
      if (result.matchUpdate?.match) {
        return {
          ...result.matchUpdate.match,
          cubeHistory: matchHistoryUpdate ?? result.matchUpdate.match.cubeHistory
        } satisfies MatchRecord;
      }
      if (matchRecord) {
        return {
          ...matchRecord,
          cubeHistory: matchHistoryUpdate ?? matchRecord.cubeHistory
        } satisfies MatchRecord;
      }
      return null;
    })();

    const updatedWhiteScore = result.matchUpdate?.game.whiteScore ?? game.whiteScore ?? 0;
    const updatedBlackScore = result.matchUpdate?.game.blackScore ?? game.blackScore ?? 0;

    const crawfordAfterAction = evaluateCrawfordState({
      rules,
      matchLength: resolvedMatchLength,
      whiteScore: updatedWhiteScore,
      blackScore: updatedBlackScore,
      match: nextMatchRecord
    });

    await persistGameSnapshot(String(gameId), {
      board: persistedSnapshot.board,
      dice: persistedSnapshot.dice,
      currentPlayer: nextCurrentPlayerColor,
      status: snapshotStatus,
      cube: {
        level: result.cube.level,
        owner: result.cube.owner,
        doublePending: result.doublePending,
        doubleOfferedBy: result.doubleOfferedBy,
        history: updatedHistory
      },
      matchLength: resolvedMatchLength,
      crawford: crawfordAfterAction
    });

    const nextState = await this.loadGameState(gameId);
    if (!nextState) {
      throw new Error('Failed to load updated cube state');
    }

    return applyTimerSnapshot(gameId, nextState);
  }

  static async getGameSummary(gameId: string | number): Promise<GameSummary | null> {
    const normalizedId = typeof gameId === 'string' ? Number(gameId) : gameId;

    if (!Number.isFinite(normalizedId)) {
      return null;
    }

    const state = await this.loadGameState(normalizedId);
    if (!state) {
      return null;
    }

    const hydrated = applyTimerSnapshot(normalizedId, state);
    return summarizeGameState(hydrated);
  }

  // Lancer les dés
  static async rollDice(gameId: number, _playerId: number): Promise<DiceState> {
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'playing') {
      throw new Error('Game is not in playing status');
    }

    // TODO: Vérifier que c'est le tour du joueur et qu'il peut lancer les dés

    const newDice = BackgammonEngine.rollDice();
    
    // TODO: Sauvegarder les dés en base

    return newDice;
  }

  // Obtenir les mouvements possibles
  static async getAvailableMoves(gameId: number, _playerId: number): Promise<Move[]> {
    const gameState = await this.loadGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    const playerColor = gameState.player1.id === _playerId ? 'white' : 'black';
    
    if (gameState.currentPlayer !== playerColor) {
      return []; // Pas de mouvements si ce n'est pas le tour du joueur
    }

    return BackgammonEngine.calculateAvailableMoves(playerColor, gameState.board, gameState.dice);
  }

  // Calculer le pip count
  static async getPipCount(gameId: number): Promise<{ white: number; black: number }> {
    const gameState = await this.loadGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    return BackgammonEngine.calculatePipCount(gameState.board);
  }
}
