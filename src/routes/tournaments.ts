import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createTournament,
  joinTournament,
  leaveTournament,
  getTournament,
  getTournamentParticipants,
  getTournamentLeaderboard,
  startTournament,
  reportTournamentMatch,
  getTournamentStandings,
  getTournamentBracket,
  getTournamentOverview
} from '../controllers/tournamentController';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createTournament);
router.post('/:id/join', joinTournament);
router.post('/:id/leave', leaveTournament);
router.get('/:id', getTournament);
router.get('/:id/participants', getTournamentParticipants);
router.get('/:id/leaderboard', getTournamentLeaderboard);
router.get('/:id/standings', getTournamentStandings);
router.get('/:id/bracket', getTournamentBracket);
router.get('/:id/overview', getTournamentOverview);
router.post('/:id/start', startTournament);
router.post('/:id/matches/:matchId/report', reportTournamentMatch);

export default router;
