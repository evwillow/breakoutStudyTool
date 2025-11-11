/**
 * Analytics - Combined metrics and behavior analysis
 */

import { getAdminSupabaseClient } from '@/app/api/_shared/clients/supabase';

interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

interface Round {
  id: string;
  user_id: string;
  dataset_name: string;
  completed: boolean;
  created_at: string;
}

interface Match {
  id: string;
  round_id: string;
  stock_symbol: string;
  correct: boolean;
  created_at: string;
  price_accuracy?: number;
  score?: number;
}

export interface ValidationMetrics {
  totalSignUps: number;
  verifiedSignUps: number;
  unverifiedSignUps: number;
  signUpRate?: number;
  usersWithRounds: number;
  usersWithMatches: number;
  usersWithCompletedRounds: number;
  averageRoundsPerUser: number;
  averageMatchesPerUser: number;
  averageMatchesPerRound: number;
  activatedUsers: number;
  activationRate: number;
  highlyEngagedUsers: number;
  highlyEngagedRate: number;
  averageAccuracy: number;
  usersWithHighAccuracy: number;
  completionRate: number;
}

export interface BehaviorAnalytics {
  activationRate: number;
  averageActivationTime: number;
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  churnedUsers: number;
  averageSessionLength: number;
  averageRoundsPerSession: number;
  powerUsers: number;
  casualUsers: number;
  oneTimeUsers: number;
  usersByDataset: Map<string, number>;
  completionRate: number;
  signUpToFirstRound: number;
  firstRoundToSecondRound: number;
  secondRoundToThirdRound: number;
  thirdRoundToPowerUser: number;
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: string): string {
  return new Date(date).toISOString().split('T')[0];
}

export async function getValidationMetrics(
  trafficData?: { totalVisitors: number; source?: string }
): Promise<ValidationMetrics> {
  const supabase = getAdminSupabaseClient();

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
  if (!users || users.length === 0) {
    return {
      totalSignUps: 0, verifiedSignUps: 0, unverifiedSignUps: 0,
      usersWithRounds: 0, usersWithMatches: 0, usersWithCompletedRounds: 0,
      averageRoundsPerUser: 0, averageMatchesPerUser: 0, averageMatchesPerRound: 0,
      activatedUsers: 0, activationRate: 0, highlyEngagedUsers: 0, highlyEngagedRate: 0,
      averageAccuracy: 0, usersWithHighAccuracy: 0, completionRate: 0,
    };
  }

  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('*')
    .order('created_at', { ascending: false });

  if (roundsError) throw new Error(`Failed to fetch rounds: ${roundsError.message}`);

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });

  if (matchesError) throw new Error(`Failed to fetch matches: ${matchesError.message}`);

  const totalSignUps = users.length;
  const verifiedSignUps = users.filter((u: User) => u.email_verified).length;
  const unverifiedSignUps = totalSignUps - verifiedSignUps;

  const userIdsWithRounds = new Set(rounds?.map((r: Round) => r.user_id) || []);
  const usersWithRounds = userIdsWithRounds.size;
  
  const userIdsWithMatches = new Set(matches?.map((m: Match) => {
    const round = rounds?.find((r: Round) => r.id === m.round_id);
    return round?.user_id;
  }).filter(Boolean) || []);
  const usersWithMatches = userIdsWithMatches.size;

  const completedRounds = rounds?.filter((r: Round) => r.completed) || [];
  const usersWithCompletedRounds = new Set(completedRounds.map((r: Round) => r.user_id)).size;

  const averageRoundsPerUser = usersWithRounds > 0 ? (rounds?.length || 0) / usersWithRounds : 0;
  const averageMatchesPerUser = usersWithMatches > 0 ? (matches?.length || 0) / usersWithMatches : 0;
  const averageMatchesPerRound = rounds && rounds.length > 0 ? (matches?.length || 0) / rounds.length : 0;

  const activatedUsers = usersWithMatches;
  const activationRate = totalSignUps > 0 ? (activatedUsers / totalSignUps) * 100 : 0;

  const roundsByUser = new Map<string, number>();
  rounds?.forEach((r: Round) => {
    roundsByUser.set(r.user_id, (roundsByUser.get(r.user_id) || 0) + 1);
  });
  const highlyEngagedUsers = Array.from(roundsByUser.values()).filter(count => count >= 3).length;
  const highlyEngagedRate = totalSignUps > 0 ? (highlyEngagedUsers / totalSignUps) * 100 : 0;

  let totalAccuracy = 0;
  let accuracyCount = 0;
  const userAccuracies = new Map<string, number[]>();

  matches?.forEach((m: Match) => {
    const round = rounds?.find((r: Round) => r.id === m.round_id);
    if (!round) return;

    const userId = round.user_id;
    if (!userAccuracies.has(userId)) userAccuracies.set(userId, []);

    let accuracy = 0;
    if (m.price_accuracy !== undefined && m.price_accuracy !== null) {
      accuracy = m.price_accuracy;
    } else if (m.score !== undefined && m.score !== null) {
      accuracy = m.score;
    } else if (m.correct !== undefined && m.correct !== null) {
      accuracy = m.correct ? 100 : 0;
    }

    userAccuracies.get(userId)!.push(accuracy);
    totalAccuracy += accuracy;
    accuracyCount++;
  });

  const averageAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0;
  let usersWithHighAccuracy = 0;
  userAccuracies.forEach((accuracies) => {
    const avgUserAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    if (avgUserAccuracy > 70) usersWithHighAccuracy++;
  });

  const completionRate = rounds && rounds.length > 0 ? (completedRounds.length / rounds.length) * 100 : 0;
  const signUpRate = trafficData?.totalVisitors ? (totalSignUps / trafficData.totalVisitors) * 100 : undefined;

  return {
    totalSignUps, verifiedSignUps, unverifiedSignUps, signUpRate,
    usersWithRounds, usersWithMatches, usersWithCompletedRounds,
    averageRoundsPerUser, averageMatchesPerUser, averageMatchesPerRound,
    activatedUsers, activationRate, highlyEngagedUsers, highlyEngagedRate,
    averageAccuracy, usersWithHighAccuracy, completionRate,
  };
}

export async function getUserBehaviorAnalytics(): Promise<BehaviorAnalytics> {
  const supabase = getAdminSupabaseClient();

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('*')
    .order('created_at', { ascending: false });

  if (roundsError) throw new Error(`Failed to fetch rounds: ${roundsError.message}`);

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });

  if (matchesError) throw new Error(`Failed to fetch matches: ${matchesError.message}`);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const roundsByUser = new Map<string, Round[]>();
  const matchesByUser = new Map<string, Match[]>();

  rounds?.forEach((round: Round) => {
    if (!roundsByUser.has(round.user_id)) roundsByUser.set(round.user_id, []);
    roundsByUser.get(round.user_id)!.push(round);
  });

  matches?.forEach((match: Match) => {
    const round = rounds?.find((r: Round) => r.id === match.round_id);
    if (!round) return;
    if (!matchesByUser.has(round.user_id)) matchesByUser.set(round.user_id, []);
    matchesByUser.get(round.user_id)!.push(match);
  });

  const userBehaviors = users?.map((user: User) => {
    const userRounds = roundsByUser.get(user.id) || [];
    const userMatches = matchesByUser.get(user.id) || [];
    const firstRound = userRounds.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    
    const allActivities = [
      ...userRounds.map(r => r.created_at),
      ...userMatches.map(m => m.created_at),
    ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const lastActivityDate = allActivities[0];

    let totalAccuracy = 0;
    let accuracyCount = 0;
    userMatches.forEach((m: Match) => {
      let accuracy = 0;
      if (m.price_accuracy !== undefined && m.price_accuracy !== null) {
        accuracy = m.price_accuracy;
      } else if (m.score !== undefined && m.score !== null) {
        accuracy = m.score;
      } else if (m.correct !== undefined && m.correct !== null) {
        accuracy = m.correct ? 100 : 0;
      }
      if (accuracy > 0 || m.correct !== undefined) {
        totalAccuracy += accuracy;
        accuracyCount++;
      }
    });
    const averageAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0;

    const daysSinceSignUp = daysBetween(user.created_at, now.toISOString());
    const daysSinceLastActivity = lastActivityDate 
      ? daysBetween(lastActivityDate, now.toISOString())
      : daysSinceSignUp;

    const isActive = lastActivityDate ? new Date(lastActivityDate) >= sevenDaysAgo : false;
    const isRetained = firstRound && userRounds.length > 1
      ? daysBetween(user.created_at, firstRound.created_at) < daysBetween(user.created_at, userRounds[userRounds.length - 1].created_at)
      : false;
    const activationTime = firstRound ? daysBetween(user.created_at, firstRound.created_at) : -1;

    return {
      userId: user.id,
      totalRounds: userRounds.length,
      totalMatches: userMatches.length,
      averageAccuracy,
      daysSinceSignUp,
      daysSinceLastActivity,
      isActive,
      isRetained,
      activationTime,
      lastActivityDate,
      signUpDate: user.created_at,
    };
  }) || [];

  const activatedUsers = userBehaviors.filter(ub => ub.activationTime >= 0);
  const activationRate = users && users.length > 0 ? (activatedUsers.length / users.length) * 100 : 0;
  const activatedUsersWithTime = activatedUsers.filter(ub => ub.activationTime >= 0);
  const averageActivationTime = activatedUsersWithTime.length > 0
    ? activatedUsersWithTime.reduce((sum, ub) => sum + ub.activationTime, 0) / activatedUsersWithTime.length
    : 0;

  const usersWithActivity = userBehaviors.filter(ub => ub.lastActivityDate);
  const day1Retention = usersWithActivity.filter(ub => {
    if (!ub.lastActivityDate) return false;
    const days = daysBetween(ub.signUpDate, ub.lastActivityDate);
    return days >= 1 && days <= 1;
  }).length;
  const day1RetentionRate = activatedUsers.length > 0 ? (day1Retention / activatedUsers.length) * 100 : 0;

  const day7Retention = usersWithActivity.filter(ub => {
    if (!ub.lastActivityDate) return false;
    const days = daysBetween(ub.signUpDate, ub.lastActivityDate);
    return days >= 1 && days <= 7;
  }).length;
  const day7RetentionRate = activatedUsers.length > 0 ? (day7Retention / activatedUsers.length) * 100 : 0;

  const day30Retention = usersWithActivity.filter(ub => {
    if (!ub.lastActivityDate) return false;
    const days = daysBetween(ub.signUpDate, ub.lastActivityDate);
    return days >= 1 && days <= 30;
  }).length;
  const day30RetentionRate = activatedUsers.length > 0 ? (day30Retention / activatedUsers.length) * 100 : 0;

  const weeklyActiveUsers = userBehaviors.filter(ub => ub.isActive).length;
  const monthlyActiveUsers = userBehaviors.filter(ub => {
    if (!ub.lastActivityDate) return false;
    return new Date(ub.lastActivityDate) >= thirtyDaysAgo;
  }).length;

  const churnedUsers = userBehaviors.filter(ub => {
    if (!ub.lastActivityDate) return false;
    return daysBetween(ub.lastActivityDate, now.toISOString()) > 30;
  }).length;

  const averageSessionLength = rounds && rounds.length > 0 ? (matches?.length || 0) / rounds.length : 0;

  const roundsByUserAndDate = new Map<string, Map<string, Round[]>>();
  rounds?.forEach((round: Round) => {
    const date = formatDate(round.created_at);
    if (!roundsByUserAndDate.has(round.user_id)) roundsByUserAndDate.set(round.user_id, new Map());
    const userDateMap = roundsByUserAndDate.get(round.user_id)!;
    if (!userDateMap.has(date)) userDateMap.set(date, []);
    userDateMap.get(date)!.push(round);
  });

  let totalSessions = 0;
  let totalRoundsInSessions = 0;
  roundsByUserAndDate.forEach((dateMap) => {
    dateMap.forEach((roundsOnDate) => {
      totalSessions++;
      totalRoundsInSessions += roundsOnDate.length;
    });
  });
  const averageRoundsPerSession = totalSessions > 0 ? totalRoundsInSessions / totalSessions : 0;

  const powerUsers = userBehaviors.filter(ub => ub.totalRounds >= 10).length;
  const casualUsers = userBehaviors.filter(ub => ub.totalRounds >= 1 && ub.totalRounds <= 3).length;
  const oneTimeUsers = userBehaviors.filter(ub => ub.totalRounds === 1).length;

  const usersByDataset = new Map<string, number>();
  rounds?.forEach((round: Round) => {
    usersByDataset.set(round.dataset_name, (usersByDataset.get(round.dataset_name) || 0) + 1);
  });

  const completionRate = rounds && rounds.length > 0 ? (rounds.filter(r => r.completed).length / rounds.length) * 100 : 0;

  const signUpToFirstRound = activatedUsers.length;
  const usersWithSecondRound = userBehaviors.filter(ub => ub.totalRounds >= 2).length;
  const firstRoundToSecondRound = activatedUsers.length > 0 ? (usersWithSecondRound / activatedUsers.length) * 100 : 0;

  const usersWithThirdRound = userBehaviors.filter(ub => ub.totalRounds >= 3).length;
  const secondRoundToThirdRound = usersWithSecondRound > 0 ? (usersWithThirdRound / usersWithSecondRound) * 100 : 0;

  const thirdRoundToPowerUser = usersWithThirdRound > 0 ? (powerUsers / usersWithThirdRound) * 100 : 0;

  return {
    activationRate,
    averageActivationTime,
    day1Retention: day1RetentionRate,
    day7Retention: day7RetentionRate,
    day30Retention: day30RetentionRate,
    weeklyActiveUsers,
    monthlyActiveUsers,
    churnedUsers,
    averageSessionLength,
    averageRoundsPerSession,
    powerUsers,
    casualUsers,
    oneTimeUsers,
    usersByDataset,
    completionRate,
    signUpToFirstRound,
    firstRoundToSecondRound,
    secondRoundToThirdRound,
    thirdRoundToPowerUser,
  };
}

