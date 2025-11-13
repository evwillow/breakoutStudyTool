/**
 * @fileoverview Core analytics module aggregating Supabase data and computing engagement metrics.
 * @module src/analytics/core.ts
 * @dependencies @/app/api/_shared/clients/supabase, ../../lib/shared
 */
/**
 * Core Analytics Module
 *
 * Consolidated analytics functionality with clear metric definitions and calculations.
 * This module provides comprehensive user behavior and engagement analytics.
 */

import { getAdminSupabaseClient } from '../web/app/api/_shared/clients/supabase';
// Import types from shared package using relative path
import type { 
  UserSegment, 
  UserSegmentDefinition, 
  UserMetrics, 
  AnalyticsMetrics, 
  DetailedUserAnalytics
} from '../../lib/shared/src/types/analytics';
import type { Round, Match } from '../../lib/shared/src/types/game';

// Re-export for backward compatibility
export type { 
  UserSegment, 
  UserSegmentDefinition, 
  UserMetrics, 
  AnalyticsMetrics, 
  DetailedUserAnalytics,
  Round,
  Match
};

// Define User interface locally (matches database schema)
export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

// Note: UserSegment, UserSegmentDefinition, UserMetrics, AnalyticsMetrics, and DetailedUserAnalytics
// are imported from shared types above. The following are local constants and implementations.

export const USER_SEGMENT_DEFINITIONS: Record<UserSegment, UserSegmentDefinition> = {
  power: {
    type: 'power',
    name: 'Power Users',
    description: 'Highly engaged, frequent users who represent your most valuable user base',
    criteria: '10+ completed rounds',
    targetPercentage: { min: 5, max: 10 },
    color: 'purple',
  },
  active: {
    type: 'active',
    name: 'Active Users',
    description: 'Regular users with moderate engagement, showing consistent interest',
    criteria: '4-9 completed rounds',
    targetPercentage: { min: 15, max: 25 },
    color: 'turquoise',
  },
  casual: {
    type: 'casual',
    name: 'Casual Users',
    description: 'Occasional users with potential for growth',
    criteria: '2-3 completed rounds',
    targetPercentage: { min: 20, max: 30 },
    color: 'blue',
  },
  'one-time': {
    type: 'one-time',
    name: 'One-Time Users',
    description: 'Trial users who need activation and re-engagement',
    criteria: 'Exactly 1 completed round',
    targetPercentage: undefined,
    color: 'yellow',
  },
  churned: {
    type: 'churned',
    name: 'Churned Users',
    description: 'Inactive users with no activity in 30+ days',
    criteria: 'No activity in 30+ days',
    targetPercentage: undefined,
    color: 'red',
  },
  new: {
    type: 'new',
    name: 'New Users',
    description: 'Recently registered users still in onboarding phase',
    criteria: 'Signed up within last 7 days, no activity yet',
    targetPercentage: undefined,
    color: 'gray',
  },
};

// Extended DetailedUserAnalytics with additional fields for internal use
export interface ExtendedDetailedUserAnalytics extends DetailedUserAnalytics {
  topPerformers: UserMetrics[];
  atRiskUsers: UserMetrics[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const weekNum = Math.ceil(
    (date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function determineUserSegment(
  totalRounds: number,
  daysSinceLastActivity: number,
  daysSinceSignUp: number
): UserSegment {
  // Churned: inactive for 30+ days (and not brand new)
  if (daysSinceLastActivity > 30 && daysSinceSignUp > 30) {
    return 'churned';
  }

  // New: signed up within last 7 days with no activity
  if (daysSinceSignUp <= 7 && totalRounds === 0) {
    return 'new';
  }

  // Segment by engagement level
  if (totalRounds >= 10) return 'power';
  if (totalRounds >= 4) return 'active';
  if (totalRounds >= 2) return 'casual';
  if (totalRounds === 1) return 'one-time';

  return 'new';
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchAllData() {
  const supabase = getAdminSupabaseClient();

  const [usersResult, roundsResult, matchesResult] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: false }),
    supabase.from('rounds').select('*').order('created_at', { ascending: false }),
    supabase.from('matches').select('*').order('created_at', { ascending: false }),
  ]);

  if (usersResult.error) throw new Error(`Failed to fetch users: ${usersResult.error.message}`);
  if (roundsResult.error) throw new Error(`Failed to fetch rounds: ${roundsResult.error.message}`);
  if (matchesResult.error) throw new Error(`Failed to fetch matches: ${matchesResult.error.message}`);

  return {
    users: (usersResult.data || []) as User[],
    rounds: (roundsResult.data || []) as Round[],
    matches: (matchesResult.data || []) as Match[],
  };
}

// ============================================================================
// ANALYTICS CALCULATIONS
// ============================================================================

export async function getDetailedAnalytics(): Promise<ExtendedDetailedUserAnalytics> {
  const { users, rounds, matches } = await fetchAllData();

  if (users.length === 0) {
    return createEmptyAnalytics();
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Build lookup maps
  const roundsByUser = new Map<string, Round[]>();
  const matchesByRound = new Map<string, Match[]>();
  const matchesByUser = new Map<string, Match[]>();

  rounds.forEach((round) => {
    if (!roundsByUser.has(round.user_id)) {
      roundsByUser.set(round.user_id, []);
    }
    roundsByUser.get(round.user_id)!.push(round);
  });

  matches.forEach((match) => {
    if (!matchesByRound.has(match.round_id)) {
      matchesByRound.set(match.round_id, []);
    }
    matchesByRound.get(match.round_id)!.push(match);

    const round = rounds.find((r) => r.id === match.round_id);
    if (round) {
      if (!matchesByUser.has(round.user_id)) {
        matchesByUser.set(round.user_id, []);
      }
      matchesByUser.get(round.user_id)!.push(match);
    }
  });

  // Calculate per-user metrics
  const userDetails: UserMetrics[] = users.map((user) => {
    const userRounds = roundsByUser.get(user.id) || [];
    const userMatches = matchesByUser.get(user.id) || [];
    const completedRounds = userRounds.filter((r) => r.completed);

    // Calculate accuracy
    let totalAccuracy = 0;
    let accuracyCount = 0;
    userMatches.forEach((m) => {
      let accuracy = 0;
      if (m.price_accuracy !== undefined && m.price_accuracy !== null) {
        accuracy = m.price_accuracy;
      } else if (m.score !== undefined && m.score !== null) {
        accuracy = m.score;
      } else if (m.correct !== undefined && m.correct !== null) {
        accuracy = m.correct ? 100 : 0;
      }
      totalAccuracy += accuracy;
      accuracyCount++;
    });
    const averageAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0;

    // Find first round and last activity
    const sortedRounds = [...userRounds].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstRound = sortedRounds[0];

    const allActivities = [...userRounds.map((r) => r.created_at), ...userMatches.map((m) => m.created_at)];
    const lastActivityDate = allActivities.length > 0
      ? allActivities.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    const daysSinceSignUp = daysBetween(user.created_at, now.toISOString());
    const daysSinceLastActivity = lastActivityDate
      ? daysBetween(lastActivityDate, now.toISOString())
      : daysSinceSignUp;

    const activationTime = firstRound ? daysBetween(user.created_at, firstRound.created_at) : -1;
    const isActive = lastActivityDate ? new Date(lastActivityDate) >= sevenDaysAgo : false;

    const segment = determineUserSegment(userRounds.length, daysSinceLastActivity, daysSinceSignUp);

    return {
      userId: user.id,
      email: user.email,
      segment,
      totalRounds: userRounds.length,
      completedRounds: completedRounds.length,
      totalMatches: userMatches.length,
      averageAccuracy,
      daysSinceSignUp,
      daysSinceLastActivity,
      activationTime,
      isActive,
      lastActivityDate,
      signUpDate: user.created_at,
    };
  });

  // Aggregate metrics
  const totalUsers = users.length;
  const verifiedUsers = users.filter((u) => u.email_verified).length;
  const activeUsers = userDetails.filter((u) => u.isActive).length;

  // User segments
  const powerUsers = userDetails.filter((u) => u.segment === 'power').length;
  const activeUserSegment = userDetails.filter((u) => u.segment === 'active').length;
  const casualUsers = userDetails.filter((u) => u.segment === 'casual').length;
  const oneTimeUsers = userDetails.filter((u) => u.segment === 'one-time').length;
  const churnedUsers = userDetails.filter((u) => u.segment === 'churned').length;

  // Activation metrics
  const activatedUsers = userDetails.filter((u) => u.activationTime >= 0);
  const activationRate = totalUsers > 0 ? (activatedUsers.length / totalUsers) * 100 : 0;
  const averageActivationTime =
    activatedUsers.length > 0
      ? activatedUsers.reduce((sum, u) => sum + u.activationTime, 0) / activatedUsers.length
      : 0;

  // Engagement metrics
  const totalRounds = rounds.length;
  const completedRounds = rounds.filter((r) => r.completed);
  const completionRate = totalRounds > 0 ? (completedRounds.length / totalRounds) * 100 : 0;

  const usersWithRounds = userDetails.filter((u) => u.totalRounds > 0).length;
  const averageRoundsPerUser = usersWithRounds > 0 ? totalRounds / usersWithRounds : 0;

  const usersWithMatches = userDetails.filter((u) => u.totalMatches > 0).length;
  const averageMatchesPerUser = usersWithMatches > 0 ? matches.length / usersWithMatches : 0;

  const totalAccuracy = userDetails.reduce((sum, u) => sum + u.averageAccuracy * u.totalMatches, 0);
  const totalMatches = userDetails.reduce((sum, u) => sum + u.totalMatches, 0);
  const averageAccuracy = totalMatches > 0 ? totalAccuracy / totalMatches : 0;

  // Retention metrics
  const day1Retention =
    activatedUsers.length > 0
      ? (userDetails.filter((u) => {
          if (!u.lastActivityDate || u.activationTime < 0) return false;
          const days = daysBetween(u.signUpDate, u.lastActivityDate);
          return days >= 1 && days <= 1;
        }).length /
          activatedUsers.length) *
        100
      : 0;

  const day7Retention =
    activatedUsers.length > 0
      ? (userDetails.filter((u) => {
          if (!u.lastActivityDate || u.activationTime < 0) return false;
          const days = daysBetween(u.signUpDate, u.lastActivityDate);
          return days >= 1 && days <= 7;
        }).length /
          activatedUsers.length) *
        100
      : 0;

  const day30Retention =
    activatedUsers.length > 0
      ? (userDetails.filter((u) => {
          if (!u.lastActivityDate || u.activationTime < 0) return false;
          const days = daysBetween(u.signUpDate, u.lastActivityDate);
          return days >= 1 && days <= 30;
        }).length /
          activatedUsers.length) *
        100
      : 0;

  const weeklyActiveUsers = userDetails.filter((u) => u.isActive).length;
  const monthlyActiveUsers = userDetails.filter((u) => {
    if (!u.lastActivityDate) return false;
    return new Date(u.lastActivityDate) >= thirtyDaysAgo;
  }).length;

  // Funnel metrics
  const signUpToFirstRound = activatedUsers.length;
  const usersWithSecondRound = userDetails.filter((u) => u.totalRounds >= 2).length;
  const firstToSecondRoundRate =
    activatedUsers.length > 0 ? (usersWithSecondRound / activatedUsers.length) * 100 : 0;

  const usersWithThirdRound = userDetails.filter((u) => u.totalRounds >= 3).length;
  const secondToThirdRoundRate =
    usersWithSecondRound > 0 ? (usersWithThirdRound / usersWithSecondRound) * 100 : 0;

  const thirdToPowerUserRate = usersWithThirdRound > 0 ? (powerUsers / usersWithThirdRound) * 100 : 0;

  // Dataset usage
  const datasetUsage = new Map<string, number>();
  rounds.forEach((round) => {
    datasetUsage.set(round.dataset_name, (datasetUsage.get(round.dataset_name) || 0) + 1);
  });

  // Time-based trends
  const usersByWeek = new Map<string, number>();
  users.forEach((user) => {
    const week = getWeekKey(user.created_at);
    usersByWeek.set(week, (usersByWeek.get(week) || 0) + 1);
  });

  const activityByWeek = new Map<string, number>();
  rounds.forEach((round) => {
    const week = getWeekKey(round.created_at);
    activityByWeek.set(week, (activityByWeek.get(week) || 0) + 1);
  });

  // Top performers and at-risk users
  const topPerformers = [...userDetails]
    .filter((u) => u.totalRounds >= 3)
    .sort((a, b) => b.averageAccuracy - a.averageAccuracy)
    .slice(0, 10);

  const atRiskUsers = [...userDetails]
    .filter((u) => u.segment === 'one-time' || (u.daysSinceLastActivity > 14 && u.daysSinceLastActivity <= 30))
    .sort((a, b) => a.daysSinceLastActivity - b.daysSinceLastActivity)
    .slice(0, 10);

  return {
    totalUsers,
    verifiedUsers,
    activeUsers,
    powerUsers,
    activeUserSegment,
    casualUsers,
    oneTimeUsers,
    churnedUsers,
    activationRate,
    averageActivationTime,
    completionRate,
    averageRoundsPerUser,
    averageMatchesPerUser,
    averageAccuracy,
    day1Retention,
    day7Retention,
    day30Retention,
    weeklyActiveUsers,
    monthlyActiveUsers,
    signUpToFirstRound,
    firstToSecondRoundRate,
    secondToThirdRoundRate,
    thirdToPowerUserRate,
    datasetUsage,
    usersByWeek,
    activityByWeek,
    userDetails,
    topPerformers,
    atRiskUsers,
  };
}

function createEmptyAnalytics(): ExtendedDetailedUserAnalytics {
  return {
    totalUsers: 0,
    verifiedUsers: 0,
    activeUsers: 0,
    powerUsers: 0,
    activeUserSegment: 0,
    casualUsers: 0,
    oneTimeUsers: 0,
    churnedUsers: 0,
    activationRate: 0,
    averageActivationTime: 0,
    completionRate: 0,
    averageRoundsPerUser: 0,
    averageMatchesPerUser: 0,
    averageAccuracy: 0,
    day1Retention: 0,
    day7Retention: 0,
    day30Retention: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    signUpToFirstRound: 0,
    firstToSecondRoundRate: 0,
    secondToThirdRoundRate: 0,
    thirdToPowerUserRate: 0,
    datasetUsage: new Map(),
    usersByWeek: new Map(),
    activityByWeek: new Map(),
    userDetails: [],
    topPerformers: [],
    atRiskUsers: [],
  };
}
