// src/controllers/gameController.ts
import { Response } from 'express';
import { GameMode } from '@prisma/client';
import { GameService } from '../services/gameService';
import { AIService, QuotaExceededError } from '../services/aiService';
import type { ApiResponse } from '../types/api';
import type { CreateGameInput, Game, GameState, GameSummary } from '../types/game';
import type { SuggestedMove } from '../types/ai';
import { AuthRequest } from '../middleware/authMiddleware';
import { ensurePlayerInGame } from '../utils/auth';

const ALLOWED_GAME_MODES: readonly GameMode[] = [
  GameMode.AI_VS_PLAYER,
  GameMode.PLAYER_VS_PLAYER,
  GameMode.TOURNAMENT
];

const parseCreateGameInput = (userId: string, body: unknown): CreateGameInput | null => {
  const candidate = (body ?? {}) as { game_mode?: unknown; stake?: unknown; opponentId?: unknown };

  const rawMode = typeof candidate.game_mode === 'string' ? candidate.game_mode.toUpperCase() : 'AI_VS_PLAYER';
  const mode = ALLOWED_GAME_MODES.includes(rawMode as GameMode) ? (rawMode as GameMode) : null;
  if (!mode) {
    return null;
  }

  const rawStake = Number(candidate.stake ?? 0);
  if (!Number.isFinite(rawStake) || rawStake < 0) {
    return null;
  }

  return {
    userId,
    mode,
    stake: Math.trunc(rawStake),
    opponentId: typeof candidate.opponentId === 'string' ? candidate.opponentId : null
  };
};

export const createGameController = async (req: AuthRequest, res: Response) => {
  const payload: ApiResponse<Game> = {
    success: false,
    error: 'Game creation temporarily disabled'
  };

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(payload);
  }

  const createInput = parseCreateGameInput(userId, req.body);
  if (!createInput) {
    return res.status(400).json({ success: false, error: 'Invalid game creation payload' } satisfies ApiResponse<Game>);
  }

  const gameService = GameService as unknown as {
    createGame?: (input: CreateGameInput) => Promise<Game>;
  };

  if (typeof gameService.createGame === 'function') {
    const createdGame = await gameService.createGame(createInput);
    return res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: createdGame
    } satisfies ApiResponse<Game>);
  }

  return res
    .status(202)
    .json({
      success: true,
      message: 'Game creation endpoint stubbed pending service implementation'
    } satisfies ApiResponse<Game>);
};

export const getGameDetails = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Game details temporarily disabled' });
};

export const rollDice = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Dice rolling temporarily disabled' });
};

export const makeMove = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Move making temporarily disabled' });
};

export const getGameStatus = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  const normalizedId = Number(gameId);
  if (!Number.isFinite(normalizedId)) {
    return res.status(400).json({ success: false, error: 'Invalid game identifier' });
  }

  const gameService = GameService as unknown as {
    loadGameState?: (id: number) => Promise<GameState | null>;
    getGameSummary?: (id: string | number) => Promise<GameSummary | null>;
  };

  if (typeof gameService.loadGameState !== 'function' || typeof gameService.getGameSummary !== 'function') {
    return res.json({ success: true, message: 'Game status temporarily disabled' });
  }

  const gameState = await gameService.loadGameState(normalizedId);

  if (!gameState) {
    return res.status(404).json({ success: false, error: 'GameNotFound', message: 'Game not found.' });
  }

  if (!ensurePlayerInGame(req, gameState)) {
    return res.status(403).json({ success: false, error: 'Unauthorized', message: 'You are not a player in this game.' });
  }

  const summary = await gameService.getGameSummary(normalizedId);

  if (!summary) {
    return res.status(500).json({ success: false, error: 'GAME_SUMMARY_ERROR', message: 'Unable to load game summary.' });
  }

  return res.json({ success: true, data: summary } satisfies ApiResponse<GameSummary>);
};

export const listAvailableGames = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Available games listing temporarily disabled' });
};

export const joinGame = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  const gameService = GameService as unknown as {
    joinGame?: (gameId: string, userId: string) => Promise<GameState>;
  };

  if (typeof gameService.joinGame === 'function') {
    const gameState = await gameService.joinGame(gameId, userId);
    return res.status(200).json({ success: true, data: gameState });
  }

  return res.json({ success: true, message: 'Game joining temporarily disabled' });
};

export const listUserGames = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'User games listing temporarily disabled' });
};

export const getAvailableMoves = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Available moves calculation temporarily disabled' });
};

export const getPipCount = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Pip count calculation temporarily disabled' });
};

export const resignGame = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Resign game temporarily disabled' });
};

export const offerDraw = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Offer draw temporarily disabled' });
};

export const getSuggestions = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required.' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Invalid game identifier', message: 'Game ID is required.' });
  }

  const gameService = GameService as unknown as {
    getGame?: (id: string) => Promise<(GameState & { whitePlayerId?: string | null; blackPlayerId?: string | null }) | null>;
  };

  const game = (await gameService.getGame?.(gameId)) ?? null;

  if (!game || !ensurePlayerInGame(req, game)) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized',
      message: 'You are not a player in this game.'
    });
  }

  const aiService = AIService as unknown as {
    getBestMove?: (input: unknown) => Promise<SuggestedMove>;
  };

  try {
    const suggestion = aiService.getBestMove
      ? await aiService.getBestMove({
          boardState: req.body?.boardState,
          dice: req.body?.dice,
          userId,
          gameId
        })
      : null;

    return res.json({
      success: true,
      data: { suggestion },
      message: suggestion ? 'Suggestion generated successfully' : 'Suggestion service unavailable'
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(error.statusCode).json({
        success: false,
        error: 'QuotaExceeded',
        message: error.message
      });
    }

    console.error('AI suggestion error:', error);
    return res.status(500).json({
      success: false,
      error: 'AI_SERVICE_ERROR',
      message: 'Failed to generate AI suggestion.'
    });
  }
};

export const evaluatePosition = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required.' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Invalid game identifier', message: 'Game ID is required.' });
  }

  const gameService = GameService as unknown as {
    getGame?: (id: string) => Promise<(GameState & { whitePlayerId?: string | null; blackPlayerId?: string | null }) | null>;
  };

  const game = (await gameService.getGame?.(gameId)) ?? null;

  if (!game || !ensurePlayerInGame(req, game)) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized',
      message: 'You are not a player in this game.'
    });
  }

  const aiService = AIService as unknown as {
    evaluatePosition?: (input: unknown) => Promise<{ equity: number; pr: number; explanation: string; winrate: number }>;
  };

  try {
    const evaluation = aiService.evaluatePosition
      ? await aiService.evaluatePosition({
          boardState: req.body?.boardState,
          dice: req.body?.dice,
          userId,
          gameId
        })
      : null;

    return res.json({
      success: true,
      data: { evaluation },
      message: evaluation ? 'Evaluation generated successfully' : 'Evaluation service unavailable'
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(error.statusCode).json({
        success: false,
        error: 'QuotaExceeded',
        message: error.message
      });
    }

    console.error('AI evaluation error:', error);
    return res.status(500).json({
      success: false,
      error: 'AI_SERVICE_ERROR',
      message: 'Failed to evaluate position.'
    });
  }
};
