import { randomUUID } from 'node:crypto';
import { prisma } from '../server';
import { broadcastTournamentEvent } from '../websocket/tournamentServer.js';
import { notificationService } from './notificationService';
import { EloService } from './eloService';
import { publishEloLeaderboardUpdates } from './leaderboardRealtimeService';
import {
  tournamentParticipantsTotal,
  tournamentsStartedTotal,
  tournamentMatchesTotal
} from '../metrics/tournamentMetrics';

export type TournamentStatus = 'REGISTRATION' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type TournamentMatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TournamentRole = 'ORGANIZER' | 'PLAYER' | 'SPECTATOR';

export interface CreateTournamentInput {
  name: string;
  description?: string | null;
  entryFee?: number | null;
  prizePool?: number | null;
  maxPlayers?: number | null;
  startTime?: Date | null;
  createdBy: string;
}

export interface TournamentSummary {
  id: string;
  name: string;
  description: string | null;
  entryFee: number;
  prizePool: number;
  maxPlayers: number | null;
  status: TournamentStatus;
  startTime: Date | null;
  endTime: Date | null;
  createdBy: string;
  participants: number;
  matches: number;
}

export interface TournamentStanding {
  participantId: string;
  userId: string;
  registeredAt: Date;
  currentPosition: number | null;
  wins: number;
  losses: number;
  eliminated: boolean;
}

export interface BracketMatch {
  id: string;
  matchNumber: number;
  whiteParticipantId: string | null;
  blackParticipantId: string | null;
  winnerParticipantId: string | null;
  status: TournamentMatchStatus;
  scheduledAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  gameId: string | null;
}

export interface BracketRound {
  round: number;
  matches: BracketMatch[];
}

const db = prisma as any;

export class TournamentService {
  static async createTournament(input: CreateTournamentInput): Promise<TournamentSummary> {
    const record = await db.tournaments.create({
      data: {
        id: randomUUID(),
        name: input.name,
        description: input.description ?? null,
        entryFee: input.entryFee ?? 0,
        prizePool: input.prizePool ?? 0,
        maxPlayers: input.maxPlayers ?? null,
        status: 'REGISTRATION',
        startTime: input.startTime ?? null,
        createdBy: input.createdBy
      }
    });

    return (await this.getTournament(record.id)) ?? {
      id: record.id,
      name: record.name,
      description: record.description ?? null,
      entryFee: record.entryFee ?? 0,
      prizePool: record.prizePool ?? 0,
      maxPlayers: record.maxPlayers ?? null,
      status: (record.status ?? 'REGISTRATION') as TournamentStatus,
      startTime: record.startTime ?? null,
      endTime: record.endTime ?? null,
      createdBy: record.createdBy,
      participants: 0,
      matches: 0
    };
  }

  static async getTournament(tournamentId: string): Promise<TournamentSummary | null> {
    const record = await db.tournaments.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: {
            participants: true,
            matches: true
          }
        }
      }
    });

    if (!record) {
      return null;
    }

    return this.mapSummary(record);
  }

  static async getUserRole(tournamentId: string, userId: string | undefined | null): Promise<TournamentRole> {
    if (!userId) {
      return 'SPECTATOR';
    }

    const tournament = await db.tournaments.findUnique({ where: { id: tournamentId } });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.createdBy === userId) {
      return 'ORGANIZER';
    }

    const participant = await db.tournament_participants.findUnique({
      where: {
        tournament_id_user_id: {
          tournament_id: tournamentId,
          user_id: userId
        }
      }
    });

    return participant ? 'PLAYER' : 'SPECTATOR';
  }

  static async listParticipants(tournamentId: string) {
    return db.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      orderBy: [{ registered_at: 'asc' }]
    });
  }

  static async listLeaderboard(tournamentId: string) {
    return db.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      orderBy: [{ current_position: 'asc' }, { registered_at: 'asc' }]
    });
  }

  static async getStandings(tournamentId: string): Promise<TournamentStanding[]> {
    const participants = await db.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      orderBy: [{ registered_at: 'asc' }]
    });

    const matches = await db.tournament_matches.findMany({
      where: { tournamentId },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
    });

    const completedMatches = matches.filter((match: any) => match.status === 'COMPLETED');

    const standings: TournamentStanding[] = participants.map((participant: any) => {
      const wins = completedMatches.filter((match: any) => match.winnerParticipantId === participant.id).length;
      const losses = completedMatches.filter((match: any) => {
        if (!match.winnerParticipantId) {
          return false;
        }
        const participated = match.whiteParticipantId === participant.id || match.blackParticipantId === participant.id;
        return participated && match.winnerParticipantId !== participant.id;
      }).length;

      return {
        participantId: participant.id,
        userId: participant.user_id,
        registeredAt: participant.registered_at,
        currentPosition: participant.current_position ?? null,
        wins,
        losses,
        eliminated: losses > 0
      } satisfies TournamentStanding;
    });

    return standings.sort((a, b) => {
      const positionA = a.currentPosition ?? Number.MAX_SAFE_INTEGER;
      const positionB = b.currentPosition ?? Number.MAX_SAFE_INTEGER;

      if (positionA !== positionB) {
        return positionA - positionB;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (a.losses !== b.losses) {
        return a.losses - b.losses;
      }

      return a.registeredAt.getTime() - b.registeredAt.getTime();
    });
  }

  static async getBracket(tournamentId: string): Promise<BracketRound[]> {
    const matches = await db.tournament_matches.findMany({
      where: { tournamentId },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
    });

    const rounds = new Map<number, BracketMatch[]>();

    for (const match of matches) {
      const roundMatches = rounds.get(match.round) ?? [];
      roundMatches.push({
        id: match.id,
        matchNumber: match.matchNumber,
        whiteParticipantId: match.whiteParticipantId ?? null,
        blackParticipantId: match.blackParticipantId ?? null,
        winnerParticipantId: match.winnerParticipantId ?? null,
        status: match.status,
        scheduledAt: match.scheduledAt ?? null,
        startedAt: match.startedAt ?? null,
        finishedAt: match.finishedAt ?? null,
        gameId: match.gameId ?? null
      });
      rounds.set(match.round, roundMatches);
    }

    return Array.from(rounds.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({ round, matches }));
  }

  static async getOverview(tournamentId: string, userId?: string | null) {
    const summary = await this.getTournament(tournamentId);

    if (!summary) {
      throw new Error('Tournament not found');
    }

    const [role, standings, bracket] = await Promise.all([
      this.getUserRole(tournamentId, userId ?? null).catch(() => 'SPECTATOR' as TournamentRole),
      this.getStandings(tournamentId),
      this.getBracket(tournamentId)
    ]);

    const meta = this.buildBracketMeta(bracket);

    return {
      tournament: summary,
      role,
      standings,
      bracket,
      meta
    };
  }

  static async listParticipantIds(tournamentId: string): Promise<string[]> {
    const participants = await db.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      select: { user_id: true }
    });

    if (!Array.isArray(participants)) {
      return [];
    }

    return participants
      .map((participant: any) => participant.user_id ?? participant.userId)
      .filter((id: unknown): id is string => typeof id === 'string');
  }

  static async joinTournament(tournamentId: string, userId: string) {
    const tournament = await db.tournaments.findUnique({ where: { id: tournamentId } });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if ((tournament.status ?? 'REGISTRATION') !== 'REGISTRATION') {
      throw new Error('Tournament is no longer accepting participants');
    }

    if (tournament.maxPlayers) {
      const count = await db.tournament_participants.count({ where: { tournament_id: tournamentId } });
      if (count >= tournament.maxPlayers) {
        throw new Error('Tournament is full');
      }
    }

    const existing = await db.tournament_participants.findUnique({
      where: {
        tournament_id_user_id: {
          tournament_id: tournamentId,
          user_id: userId
        }
      }
    });

    if (existing) {
      throw new Error('User already registered in this tournament');
    }

    const participant = await db.tournament_participants.create({
      data: {
        id: randomUUID(),
        tournament_id: tournamentId,
        user_id: userId,
        current_position: 0
      }
    });

    tournamentParticipantsTotal.labels('join').inc();

    return participant;
  }

  static async leaveTournament(tournamentId: string, userId: string) {
    const tournament = await db.tournaments.findUnique({ where: { id: tournamentId } });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if ((tournament.status ?? 'REGISTRATION') !== 'REGISTRATION') {
      throw new Error('Participants cannot leave once the tournament has started');
    }

    const participant = await db.tournament_participants.findUnique({
      where: {
        tournament_id_user_id: {
          tournament_id: tournamentId,
          user_id: userId
        }
      }
    });

    if (!participant) {
      throw new Error('User not registered in this tournament');
    }

    await db.tournament_participants.delete({
      where: { id: participant.id }
    });

    tournamentParticipantsTotal.labels('leave').inc();
  }

  static async startTournament(tournamentId: string) {
    const participants = await db.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      orderBy: [{ registered_at: 'asc' }]
    });

    if (participants.length < 2) {
      throw new Error('At least two participants are required to start the tournament');
    }

    const result = await db.$transaction(async (tx: any) => {
      await tx.tournaments.update({
        where: { id: tournamentId },
        data: { status: 'IN_PROGRESS', startTime: new Date() }
      });

      return this.generateRoundMatches(tx, tournamentId, 1, participants.map((p: any) => p.id));
    });

    const tournament = await this.getTournament(tournamentId);

    tournamentsStartedTotal.inc();

    broadcastTournamentEvent(tournamentId, 'tournamentUpdated', {
      tournamentId,
      type: 'started',
      round: 1
    });

    await this.notifyParticipants({
      tournamentId,
      tournament,
      round: 1,
      message: 'Le tournoi démarre ! Round 1 disponible.'
    });

    this.emitMatchLifecycleEvents(tournamentId, 1, result);
  }

  static async reportMatchResult(options: {
    matchId: string;
    winnerParticipantId: string;
    gameId?: string | null;
  }) {
    const { matchId, winnerParticipantId, gameId } = options;

    const transactionResult = await db.$transaction(async (tx: any) => {
      const match = await tx.tournament_matches.update({
        where: { id: matchId },
        data: {
          winnerParticipantId,
          status: 'COMPLETED',
          finishedAt: new Date(),
          gameId: gameId ?? undefined
        }
      });

      const participantIds = [match.whiteParticipantId, match.blackParticipantId].filter(
        (value): value is string => typeof value === 'string'
      );

      const participantRecords = participantIds.length
        ? await tx.tournament_participants.findMany({
            where: { id: { in: participantIds } },
            select: { id: true, user_id: true }
          })
        : [];

      const winnerRecord = participantRecords.find((participant: any) => participant.id === winnerParticipantId);
      const loserParticipantId = participantIds.find((participantId) => participantId !== winnerParticipantId) ?? null;
      const loserRecord = loserParticipantId
        ? participantRecords.find((participant: any) => participant.id === loserParticipantId)
        : null;

      await tx.tournament_participants.update({
        where: { id: winnerParticipantId },
        data: {
          current_position: match.round
        }
      });

      const remaining = await tx.tournament_matches.count({
        where: {
          tournamentId: match.tournamentId,
          round: match.round,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
        }
      });

      let tournamentFinished = false;
      let nextRound: Awaited<ReturnType<typeof this.generateRoundMatches>> | null = null;
      let winners: string[] = [];

      if (remaining === 0) {
        const roundWinners = await tx.tournament_matches.findMany({
          where: { tournamentId: match.tournamentId, round: match.round },
          select: { winnerParticipantId: true }
        });

        winners = roundWinners
          .map((entry: any) => entry.winnerParticipantId)
          .filter((value: unknown): value is string => typeof value === 'string');

        if (winners.length <= 1) {
          await tx.tournaments.update({
            where: { id: match.tournamentId },
            data: { status: 'FINISHED', endTime: new Date() }
          });
          tournamentFinished = true;
        } else {
          nextRound = await this.generateRoundMatches(tx, match.tournamentId, (match.round ?? 0) + 1, winners);
        }
      }

      return {
        match,
        tournamentFinished,
        winners,
        nextRound,
        winnerUserId: typeof winnerRecord?.user_id === 'string' ? winnerRecord.user_id : null,
        loserUserId: typeof loserRecord?.user_id === 'string' ? loserRecord.user_id : null
      };
    });

    const { match, tournamentFinished, winners, nextRound, winnerUserId, loserUserId } = transactionResult;

    if (winnerUserId && loserUserId && winnerUserId !== loserUserId) {
      const eloResult = await EloService.applyMatchResult({
        winnerUserId,
        loserUserId
      });
      await publishEloLeaderboardUpdates(eloResult);
    }

    tournamentMatchesTotal.labels('completed').inc();

    broadcastTournamentEvent(match.tournamentId, 'matchFinished', {
      tournamentId: match.tournamentId,
      matchId: match.id,
      round: match.round,
      winnerParticipantId
    });

    await this.notifyParticipants({
      tournamentId: match.tournamentId,
      message: `Match ${match.matchNumber} du round ${match.round} terminé`,
      round: match.round,
      payload: {
        matchId: match.id,
        winnerParticipantId
      }
    });

    if (tournamentFinished) {
      broadcastTournamentEvent(match.tournamentId, 'tournamentEnded', {
        tournamentId: match.tournamentId,
        winnerParticipantId: winners[0] ?? null
      });

      await this.notifyParticipants({
        tournamentId: match.tournamentId,
        message: 'Le tournoi est terminé !',
        round: match.round,
        payload: {
          winnerParticipantId: winners[0] ?? null
        }
      });
      return;
    }

    if (nextRound) {
      const nextRoundNumber = (match.round ?? 0) + 1;

      await this.notifyParticipants({
        tournamentId: match.tournamentId,
        message: `Round ${nextRoundNumber} disponible`,
        round: nextRoundNumber
      });

      this.emitMatchLifecycleEvents(match.tournamentId, nextRoundNumber, nextRound);
    }
  }

  private static async generateRoundMatches(
    tx: any,
    tournamentId: string,
    round: number,
    participantIds: string[]
  ) {
    if (participantIds.length < 2) {
      return { scheduledMatches: [], autoAdvancedMatches: [] };
    }

    const scheduledMatches: any[] = [];
    const autoAdvancedMatches: any[] = [];
    const autoAdvancedParticipantIds: string[] = [];
    let matchCounter = 1;

    for (let i = 0; i < participantIds.length; i += 2) {
      const whiteId = participantIds[i];
      const blackId = participantIds[i + 1] ?? null;

      if (!whiteId) {
        continue;
      }

      if (!blackId) {
        const match = await tx.tournament_matches.create({
          data: {
            id: randomUUID(),
            tournamentId,
            round,
            matchNumber: matchCounter++,
            whiteParticipantId: whiteId,
            status: 'COMPLETED',
            winnerParticipantId: whiteId,
            finishedAt: new Date()
          }
        });
        autoAdvancedMatches.push(match);
        autoAdvancedParticipantIds.push(whiteId);
        continue;
      }

      const match = await tx.tournament_matches.create({
        data: {
          id: randomUUID(),
          tournamentId,
          round,
          matchNumber: matchCounter++,
          whiteParticipantId: whiteId,
          blackParticipantId: blackId,
          status: 'SCHEDULED',
          scheduledAt: new Date()
        }
      });
      scheduledMatches.push(match);
    }

    if (autoAdvancedParticipantIds.length > 0) {
      await tx.tournament_participants.updateMany({
        where: { id: { in: autoAdvancedParticipantIds } },
        data: { current_position: round }
      });
    }

    return { scheduledMatches, autoAdvancedMatches };
  }

  static async notifyParticipants(options: {
    tournamentId: string;
    message: string;
    round?: number;
    payload?: Record<string, unknown> | null;
    excludeUserIds?: string[];
    tournament?: TournamentSummary | null;
  }) {
    const {
      tournamentId,
      message,
      round = 0,
      payload = null,
      excludeUserIds = [],
      tournament
    } = options;

    const exclude = new Set(excludeUserIds);
    const participantIds = await this.listParticipantIds(tournamentId);
    const summary = tournament ?? (await this.getTournament(tournamentId));
    const targets = new Set<string>(participantIds);

    if (summary?.createdBy) {
      targets.add(summary.createdBy);
    }

    for (const userId of targets) {
      if (!userId || exclude.has(userId)) {
        continue;
      }

      notificationService.notifyTournamentUpdate(userId, {
        tournamentId,
        round,
        message,
        payload
      });
    }
  }

  private static emitMatchLifecycleEvents(
    tournamentId: string,
    round: number,
    matches: { scheduledMatches: any[]; autoAdvancedMatches: any[] }
  ) {
    const { scheduledMatches, autoAdvancedMatches } = matches;

    if (scheduledMatches.length > 0) {
      tournamentMatchesTotal.labels('scheduled').inc(scheduledMatches.length);
      for (const match of scheduledMatches) {
        broadcastTournamentEvent(tournamentId, 'matchCreated', {
          tournamentId,
          matchId: match.id,
          round,
          matchNumber: match.matchNumber,
          whiteParticipantId: match.whiteParticipantId,
          blackParticipantId: match.blackParticipantId
        });
      }
    }

    if (autoAdvancedMatches.length > 0) {
      tournamentMatchesTotal.labels('auto_advance').inc(autoAdvancedMatches.length);
      for (const match of autoAdvancedMatches) {
        broadcastTournamentEvent(tournamentId, 'matchFinished', {
          tournamentId,
          matchId: match.id,
          round,
          winnerParticipantId: match.winnerParticipantId
        });
      }
    }
  }

  private static buildBracketMeta(bracket: BracketRound[]) {
    const totalRounds = bracket.length;
    const playedRounds = bracket
      .filter((round) => round.matches.some((match) => match.status === 'COMPLETED' || match.status === 'IN_PROGRESS'))
      .map((round) => round.round);

    const currentRound = playedRounds.length ? Math.max(...playedRounds) : 0;

    const upcomingRound = bracket
      .filter((round) => round.matches.some((match) => match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS'))
      .sort((a, b) => a.round - b.round)[0]?.round;

    const nextRound = upcomingRound && upcomingRound > currentRound ? upcomingRound : currentRound > 0 ? currentRound + 1 : (bracket[0]?.round ?? 1);

    return {
      currentRound,
      nextRound,
      totalRounds
    };
  }

  private static mapSummary(record: any): TournamentSummary {
    const counts = record._count ?? { participants: 0, matches: 0 };

    return {
      id: record.id,
      name: record.name,
      description: record.description ?? null,
      entryFee: record.entryFee ?? 0,
      prizePool: record.prizePool ?? 0,
      maxPlayers: record.maxPlayers ?? null,
      status: (record.status ?? 'REGISTRATION') as TournamentStatus,
      startTime: record.startTime ?? null,
      endTime: record.endTime ?? null,
      createdBy: record.createdBy,
      participants: counts.participants ?? 0,
      matches: counts.matches ?? 0
    };
  }
}
