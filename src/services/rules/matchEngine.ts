/**
 * @file matchEngine.ts
 * @description Core match engine responsible for scoring, match length handling and special rules
 * (Crawford, Jacoby, Beaver/Raccoon). This module exposes helper functions that other services
 * (cubeLogic, resignationService, controllers) will consume to keep match play consistent with
 * official backgammon rules.
 */

import type { games } from '@prisma/client';

type MatchState = 'IN_PROGRESS' | 'FINISHED';

export type MatchRecord = {
  id: string;
  gameId: string;
  length: number;
  rules: MatchRulesOptions;
  state: MatchState;
  crawfordUsed: boolean;
  cubeHistory: unknown;
};

export interface CrawfordState {
  enabled: boolean;
  active: boolean;
  used: boolean;
  matchLength: number | null;
  oneAwayScore: number | null;
  triggeredBy: 'white' | 'black' | null;
}

export function defaultCrawfordState(): CrawfordState {
  return {
    enabled: false,
    active: false,
    used: false,
    matchLength: null,
    oneAwayScore: null,
    triggeredBy: null
  } satisfies CrawfordState;
}

/**
 * Options that define which special rules are enabled for the current match.
 */
export interface MatchRulesOptions {
  /** Crawford rule forbids doubling in the game immediately following reaching match point. */
  crawford: boolean;
  /** Jacoby rule (money games) scores gammons/backgammons only when the cube has been turned. */
  jacoby: boolean;
  /** Beaver option lets a player immediately redouble while retaining ownership. */
  beaver: boolean;
  /** Raccoon option allows the original doubler to redouble immediately after a beaver. */
  raccoon: boolean;
}

/**
 * Snapshot describing the outcome of processing a match event.
 */
export interface MatchUpdateResult {
  game: games;
  match: MatchRecord | null;
  finished: boolean;
}

/**
 * Calculates the new score after a point result (win, gammon, backgammon, resignation).
 * @param game Current game record.
 * @param match Optional match record (null for money games).
 * @param points Points won (already accounting for cube value & resignation type).
 * @param winner Player identifier ("white" | "black").
 * @returns Updated game/match state and whether the match has finished.
 */
export function applyPointResult(
  game: games,
  match: MatchRecord | null,
  points: number,
  winner: 'white' | 'black'
): MatchUpdateResult {
  const updatedGame = {
    ...game,
    whiteScore: winner === 'white' ? game.whiteScore + points : game.whiteScore,
    blackScore: winner === 'black' ? game.blackScore + points : game.blackScore,
    doublePending: false,
    doubleOfferedBy: null,
    cubeOwner: winner === 'white' ? 'WHITE' : 'BLACK'
  } as games;

  let updatedMatch: MatchRecord | null = match ? { ...match } : null;
  let finished = false;

  if (updatedMatch) {
    const winnerScore = winner === 'white' ? updatedGame.whiteScore : updatedGame.blackScore;
    const matchPoint = updatedMatch.length;

    if (updatedMatch.rules.crawford && !updatedMatch.crawfordUsed) {
      const preScore = winner === 'white' ? game.whiteScore : game.blackScore;
      if (preScore === matchPoint - 1) {
        updatedMatch = { ...updatedMatch, crawfordUsed: true };
      }
    }

    if (winnerScore >= matchPoint) {
      updatedMatch = { ...updatedMatch, state: 'FINISHED' };
      finished = true;
    }
  } else {
    finished = true;
  }

  return {
    game: updatedGame,
    match: updatedMatch,
    finished
  };
}

/**
 * Determines whether the specified player is allowed to double, given the match state and rules.
 * Crawford and other special rules should be enforced here.
 */
export function canDouble(
  game: games,
  match: MatchRecord | null,
  player: 'white' | 'black',
  rules: MatchRulesOptions
): boolean {
  void player;

  const crawford = evaluateCrawfordState({
    rules,
    matchLength: match?.length ?? (game.matchLength ?? null),
    whiteScore: game.whiteScore ?? 0,
    blackScore: game.blackScore ?? 0,
    match
  });

  if (crawford.active) {
    return false;
  }

  // TODO: Enforce Jacoby, beaver/raccoon restrictions and ownership constraints here.
  return true;
}

export function evaluateCrawfordState(params: {
  rules: MatchRulesOptions;
  matchLength: number | null;
  whiteScore: number;
  blackScore: number;
  match: MatchRecord | null;
}): CrawfordState {
  const { rules, matchLength, whiteScore, blackScore, match } = params;

  const resolvedLength = matchLength ?? match?.length ?? null;
  const oneAwayScore = resolvedLength !== null ? resolvedLength - 1 : null;
  const used = match?.crawfordUsed ?? false;

  if (!rules.crawford || resolvedLength === null || oneAwayScore === null) {
    return {
      enabled: Boolean(rules.crawford && resolvedLength !== null),
      active: false,
      used,
      matchLength: resolvedLength,
      oneAwayScore,
      triggeredBy: null
    } satisfies CrawfordState;
  }

  let triggeredBy: 'white' | 'black' | null = null;
  if (whiteScore === oneAwayScore) {
    triggeredBy = 'white';
  } else if (blackScore === oneAwayScore) {
    triggeredBy = 'black';
  }

  const active = Boolean(triggeredBy && !used);

  return {
    enabled: true,
    active,
    used,
    matchLength: resolvedLength,
    oneAwayScore,
    triggeredBy
  } satisfies CrawfordState;
}

/**
 * Factory utility to create default match rules when none are provided by the client.
 */
export function createDefaultRules(): MatchRulesOptions {
  return {
    crawford: true,
    jacoby: false,
    beaver: false,
    raccoon: false
  };
}

// ✅ Validation
// - Objectif: poser le squelette du moteur de match (score, règles spéciales).
// - Tests exécutés: aucun (implémentation manquante, stubs en place).
// - À faire: ajouter la logique complète (score/cube), gérer états MatchState, écrire tests unitaires
//   et mettre à jour les contrôleurs pour consommer ces helpers.
