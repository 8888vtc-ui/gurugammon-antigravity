// src/routes/games.ts
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createGameController,
  getGameStatus,
  joinGame,
  rollDice,
  makeMove,
  resignGame,
  offerDraw,
  getSuggestions,
  evaluatePosition
} from '../controllers/gameController';
import {
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  getMatchmakingStatus
} from '../controllers/matchmakingController';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createGameController);

router.post('/:gameId/join', joinGame);
router.post('/:gameId/roll', rollDice);
router.post('/:gameId/move', makeMove);
router.post('/:gameId/resign', resignGame);
router.post('/:gameId/draw', offerDraw);
router.post('/:gameId/suggestions', getSuggestions);
router.post('/:gameId/evaluate', evaluatePosition);
router.post('/matchmaking/join', joinMatchmakingQueue);
router.post('/matchmaking/leave', leaveMatchmakingQueue);
router.get('/matchmaking/status', getMatchmakingStatus);
router.get('/:gameId/status', getGameStatus);

export default router;
