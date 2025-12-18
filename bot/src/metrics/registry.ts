import { Registry, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';

export const metricsRegistry = new Registry();

metricsRegistry.setDefaultLabels({
  service: 'gammon-guru-backend'
});

collectDefaultMetrics({
  register: metricsRegistry
});

export const activeGames = new Gauge({
  name: 'active_games',
  help: 'Number of currently active games',
  registers: [metricsRegistry]
});

export const moveTimeHistogram = new Histogram({
  name: 'move_time_seconds',
  help: 'Time taken to process a move',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

export const coachCallsTotal = new Counter({
  name: 'coach_calls_total',
  help: 'Total number of calls to the Coach API',
  registers: [metricsRegistry]
});

export const tournamentRounds = new Gauge({
  name: 'tournament_rounds',
  help: 'Current round number of active tournaments',
  labelNames: ['tournament_id'],
  registers: [metricsRegistry]
});

export const tournamentParticipantsTotal = new Gauge({
  name: 'tournament_participants_total',
  help: 'Total participants joined/left',
  labelNames: ['type'], // 'join' | 'leave'
  registers: [metricsRegistry]
});

export const tournamentsStartedTotal = new Counter({
  name: 'tournaments_started_total',
  help: 'Total number of tournaments started',
  registers: [metricsRegistry]
});

export const tournamentMatchesTotal = new Counter({
  name: 'tournament_matches_total',
  help: 'Total tournament matches status changes',
  labelNames: ['status'], // 'scheduled' | 'auto_advance' | 'completed'
  registers: [metricsRegistry]
});
