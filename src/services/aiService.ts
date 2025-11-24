// src/services/AIService.ts
import type { AnalysisQuota } from '@prisma/client';
import type { Move } from '../types/game';
import type { EvaluationResult, SuggestedMove } from '../types/ai';
import { prisma } from '../server';
import { SubscriptionService, type UserPlan } from './subscriptionService';
import { GNUBGProvider } from '../providers/gnubgProvider';

export interface AnalyzeInput {
  boardState: unknown;
  dice: unknown;
  move?: Move | null;
  userId?: string;
  gameId?: string;
}

export interface AIProvider {
  getBestMove(input: AnalyzeInput): Promise<SuggestedMove>;
  evaluatePosition(input: AnalyzeInput): Promise<EvaluationResult>;
}

let activeProvider: AIProvider = new GNUBGProvider();

const FREE_QUOTA = 5;
const PREMIUM_QUOTA = 10;

const quotaKey = (userId: string, date: Date) => ({
  userId_date: {
    userId,
    date
  }
});

const startOfUtcDay = (date = new Date()) => {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return utc;
};

async function getQuotaRecord(userId: string, day: Date): Promise<AnalysisQuota> {
  let record = await prisma.analysisQuota.findUnique({
    where: quotaKey(userId, day)
  });

  if (record) {
    return record;
  }

  const previous = await prisma.analysisQuota.findFirst({
    where: { userId },
    orderBy: { date: 'desc' }
  });

  record = await prisma.analysisQuota.create({
    data: {
      userId,
      date: day,
      count: 0,
      extraQuota: 0,
      initialFree: previous ? previous.initialFree : true
    }
  });

  return record;
}

export class QuotaExceededError extends Error {
  readonly statusCode = 429;

  constructor(message = 'Quota IA atteint. Chaque analyse a un coût. Passez Premium ou achetez des analyses supplémentaires.') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export type QuotaInfo = {
  plan: UserPlan;
  used: number;
  limit: number;
  extra: number;
};

const resolveLimit = (plan: UserPlan, quota: AnalysisQuota): number => {
  if (plan === 'premium') {
    return PREMIUM_QUOTA;
  }

  return quota.initialFree ? FREE_QUOTA : 0;
};

const maybeDisableInitialFree = (plan: UserPlan, quota: AnalysisQuota, nextCount: number) => {
  if (plan === 'free' && quota.initialFree && nextCount >= FREE_QUOTA) {
    return { initialFree: false };
  }
  return {};
};

export const checkQuota = async (userId: string): Promise<'ok' | 'limit'> => {
  if (!userId) {
    return 'limit';
  }

  const today = startOfUtcDay();
  const quota = await getQuotaRecord(userId, today);
  const plan = await SubscriptionService.getUserPlan(userId);
  const limit = resolveLimit(plan, quota);

  if (limit > 0 && quota.count < limit) {
    const nextCount = quota.count + 1;
    await prisma.analysisQuota.update({
      where: quotaKey(userId, today),
      data: {
        count: { increment: 1 },
        ...maybeDisableInitialFree(plan, quota, nextCount)
      }
    });
    return 'ok';
  }

  if (quota.extraQuota > 0) {
    await prisma.analysisQuota.update({
      where: quotaKey(userId, today),
      data: {
        extraQuota: { decrement: 1 },
        ...(plan === 'free' && quota.initialFree ? { initialFree: false } : {})
      }
    });
    return 'ok';
  }

  if (plan === 'free' && quota.initialFree && limit === 0) {
    await prisma.analysisQuota.update({
      where: quotaKey(userId, today),
      data: { initialFree: false }
    });
  }

  return 'limit';
};

export const getQuotaStatus = async (userId: string): Promise<QuotaInfo> => {
  const today = startOfUtcDay();
  const quota = await getQuotaRecord(userId, today);
  const plan = await SubscriptionService.getUserPlan(userId);
  const limit = resolveLimit(plan, quota);

  return {
    plan,
    used: quota.count,
    limit,
    extra: quota.extraQuota
  };
};

export const addExtraQuota = async (userId: string, amount: number): Promise<number> => {
  if (!userId) {
    throw new Error('User identifier is required to purchase analyses');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid amount provided for quota purchase');
  }

  const today = startOfUtcDay();
  await getQuotaRecord(userId, today);

  const updated = await prisma.analysisQuota.update({
    where: quotaKey(userId, today),
    data: {
      extraQuota: { increment: Math.trunc(amount) }
    }
  });

  return updated.extraQuota;
};

export const setAIProvider = (provider: AIProvider) => {
  activeProvider = provider;
};

export async function getBestMove(input: AnalyzeInput): Promise<SuggestedMove> {
  if (!input.userId) {
    throw new Error('userId is required for AI analysis');
  }

  const quota = await checkQuota(input.userId);
  if (quota === 'limit') {
    throw new QuotaExceededError();
  }

  return activeProvider.getBestMove(input);
}

export async function evaluatePosition(input: AnalyzeInput): Promise<EvaluationResult> {
  if (!input.userId) {
    throw new Error('userId is required for AI analysis');
  }

  const quota = await checkQuota(input.userId);
  if (quota === 'limit') {
    throw new QuotaExceededError();
  }

  return activeProvider.evaluatePosition(input);
}

export const AIService = {
  getBestMove,
  evaluatePosition,
  checkQuota,
  getQuotaStatus,
  addExtraQuota
};
