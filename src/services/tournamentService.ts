import { prisma } from '../lib/prisma';
import { broadcastTournamentEvent } from '../websocket/tournamentServer';
import { AppError } from '../utils/errors';
import { GameService } from './gameService';
import { tournamentRounds } from '../metrics/registry';

export class TournamentService {
  static async createTournament(
    name: string,
    creatorId: string,
    options: {
      description?: string;
      entryFee?: number;
      prizePool?: number;
      maxPlayers?: number;
      startTime?: Date;
    }
  ) {
    const tournament = await prisma.tournaments.create({
      data: {
        id: crypto.randomUUID(),
        name,
        createdBy: creatorId,
        description: options.description,
        entryFee: options.entryFee ?? 0,
        prizePool: options.prizePool ?? 0,
        maxPlayers: options.maxPlayers,
        startTime: options.startTime,
        status: 'REGISTRATION'
      }
    });

    return tournament;
  }

  static async registerPlayer(tournamentId: string, userId: string) {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: { participants: true }
    });

    if (!tournament) throw new AppError('Tournament not found', 404);
    if (tournament.status !== 'REGISTRATION') throw new AppError('Registration closed', 400);
    if (tournament.maxPlayers && tournament.participants.length >= tournament.maxPlayers) {
      throw new AppError('Tournament full', 400);
    }

    const participant = await prisma.tournament_participants.create({
      data: {
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        user_id: userId,
        current_position: 0
      }
    });

    broadcastTournamentEvent(tournamentId, 'playerJoined', { userId });
    return participant;
  }

  static async startTournament(tournamentId: string, userId: string) {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: { participants: true }
    });

    if (!tournament) throw new AppError('Tournament not found', 404);
    if (tournament.createdBy !== userId) throw new AppError('Unauthorized', 403);
    if (tournament.participants.length < 2) throw new AppError('Not enough players', 400);

    await prisma.tournaments.update({
      where: { id: tournamentId },
      data: { status: 'IN_PROGRESS', startTime: new Date() }
    });

    await this.generatePairings(tournamentId, 1);

    broadcastTournamentEvent(tournamentId, 'tournamentUpdated', { status: 'IN_PROGRESS' });
  }

  static async generatePairings(tournamentId: string, round: number) {
    // Update metrics
    tournamentRounds.set({ tournament_id: tournamentId }, round);

    const participants = await prisma.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      include: {
        wonMatches: true,
        whiteMatches: true,
        blackMatches: true
      }
    });

    // Calculate scores (1 point per win, 0.5 per bye/draw if we had them, but simplified to 1 for win)
    const playersWithScores = participants.map(p => {
      const wins = p.wonMatches.length;
      // Check for byes (matches with no opponent)
      const byes = p.whiteMatches.filter(m => !m.blackParticipantId && m.winnerParticipantId === p.id).length +
        p.blackMatches.filter(m => !m.whiteParticipantId && m.winnerParticipantId === p.id).length;
      return { ...p, score: wins + byes };
    });

    // Sort by score descending
    playersWithScores.sort((a, b) => b.score - a.score);

    const pairings: Array<[typeof playersWithScores[0], typeof playersWithScores[0] | null]> = [];
    const pairedIds = new Set<string>();

    // Simple Swiss pairing: pair top score with next top score
    for (let i = 0; i < playersWithScores.length; i++) {
      if (pairedIds.has(playersWithScores[i].id)) continue;

      const p1 = playersWithScores[i];
      let p2 = null;

      // Find next unpaired player
      for (let j = i + 1; j < playersWithScores.length; j++) {
        if (!pairedIds.has(playersWithScores[j].id)) {
          p2 = playersWithScores[j];
          break;
        }
      }

      if (p2) {
        pairings.push([p1, p2]);
        pairedIds.add(p1.id);
        pairedIds.add(p2.id);
      } else {
        // Bye
        pairings.push([p1, null]);
        pairedIds.add(p1.id);
      }
    }

    // Create matches
    for (const [p1, p2] of pairings) {
      if (p2) {
        // Create actual game
        const game = await GameService.createGame({
          userId: p1.user_id,
          mode: 'TOURNAMENT',
          opponentId: p2.user_id,
          stake: 0
        });

        // Link game to tournament
        await prisma.games.update({
          where: { id: game.id },
          data: { tournamentId }
        });

        await prisma.tournament_matches.create({
          data: {
            tournamentId,
            round,
            matchNumber: 0,
            whiteParticipantId: p1.id,
            blackParticipantId: p2.id,
            gameId: game.id,
            status: 'SCHEDULED'
          }
        });

        broadcastTournamentEvent(tournamentId, 'matchCreated', {
          whiteId: p1.user_id,
          blackId: p2.user_id,
          gameId: game.id
        });

      } else {
        // Handle Bye
        await prisma.tournament_matches.create({
          data: {
            tournamentId,
            round,
            matchNumber: 0,
            whiteParticipantId: p1.id,
            winnerParticipantId: p1.id, // Auto win
            status: 'COMPLETED',
            finishedAt: new Date()
          }
        });
      }
    }
  }

  static async handleMatchCompletion(gameId: string, winnerId: string) {
    const match = await prisma.tournament_matches.findUnique({
      where: { gameId },
      include: {
        white: true,
        black: true,
        tournament: { include: { participants: true } }
      }
    });

    if (!match) return;

    const winnerParticipant = match.whiteParticipantId && match.white?.user_id === winnerId
      ? match.white
      : match.black;

    if (!winnerParticipant) return;

    await prisma.tournament_matches.update({
      where: { id: match.id },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        winnerParticipantId: winnerParticipant.id
      }
    });

    broadcastTournamentEvent(match.tournamentId, 'matchFinished', { gameId, winnerId });

    // Check if round is complete
    const currentRoundMatches = await prisma.tournament_matches.findMany({
      where: {
        tournamentId: match.tournamentId,
        round: match.round
      }
    });

    const allComplete = currentRoundMatches.every(m => m.status === 'COMPLETED');

    if (allComplete) {
      // Start next round or finish tournament
      if (match.round < 3) {
        await this.generatePairings(match.tournamentId, match.round + 1);
      } else {
        await prisma.tournaments.update({
          where: { id: match.tournamentId },
          data: { status: 'FINISHED', endTime: new Date() }
        });
        broadcastTournamentEvent(match.tournamentId, 'tournamentEnded', {});
      }
    }
  }
}
