import type { AnalyticsData, SegmentDefinition } from '@breakout-study-tool/shared';
import { getDetailedAnalytics, USER_SEGMENT_DEFINITIONS } from '@/analytics/core';

type MapLike<T> = Map<string, T> | Record<string, T>;

function mapToObject<T>(input: MapLike<T>): Record<string, T> {
  if (input instanceof Map) {
    return Object.fromEntries(input);
  }
  return { ...input };
}

export async function getAnalyticsApiPayload() {
  const analytics = await getDetailedAnalytics();

  return {
    ...analytics,
    datasetUsage: mapToObject(analytics.datasetUsage),
    usersByWeek: mapToObject(analytics.usersByWeek),
    activityByWeek: mapToObject(analytics.activityByWeek),
    segmentDefinitions: USER_SEGMENT_DEFINITIONS,
  };
}

export interface SegmentBreakdown {
  label: string;
  value: number;
  color: string;
}

export interface AnalyticsViewModel {
  userSegmentData: SegmentBreakdown[];
  retentionData: Array<{ label: string; value: number }>;
  funnelData: Array<{ label: string; value: number }>;
  datasetData: Array<{ label: string; value: number }>;
  weeklySignups: Array<{ label: string; value: number }>;
  weeklyActivity: Array<{ label: string; value: number }>;
  segmentPercentages: Record<string, number>;
  segmentDefinitions: Record<string, SegmentDefinition>;
}

export function buildAnalyticsViewModel(analytics: AnalyticsData): AnalyticsViewModel {
  const segmentDefinitions = USER_SEGMENT_DEFINITIONS;

  const userSegmentData: SegmentBreakdown[] = [
    { label: 'Power Users (10+)', value: analytics.powerUsers, color: 'fill-purple-500' },
    { label: 'Active Users (4-9)', value: analytics.activeUserSegment, color: 'fill-turquoise-500' },
    { label: 'Casual Users (2-3)', value: analytics.casualUsers, color: 'fill-blue-500' },
    { label: 'One-Time Users', value: analytics.oneTimeUsers, color: 'fill-yellow-500' },
    { label: 'Churned Users', value: analytics.churnedUsers, color: 'fill-red-500' },
  ];

  const retentionData = [
    { label: 'Day 1', value: Math.round(analytics.day1Retention) },
    { label: 'Day 7', value: Math.round(analytics.day7Retention) },
    { label: 'Day 30', value: Math.round(analytics.day30Retention) },
  ];

  const funnelData = [
    { label: 'Sign-up → First Round', value: analytics.signUpToFirstRound },
    {
      label: 'First → Second Round',
      value: Math.round((analytics.firstToSecondRoundRate / 100) * analytics.signUpToFirstRound),
    },
    {
      label: 'Second → Third Round',
      value: Math.round(
        (analytics.secondToThirdRoundRate / 100) *
          (analytics.firstToSecondRoundRate / 100) *
          analytics.signUpToFirstRound
      ),
    },
    {
      label: 'Third → Power User',
      value: analytics.powerUsers,
    },
  ];

  const datasetEntries = Object.entries(analytics.datasetUsage || {});
  const datasetData = datasetEntries
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const weeklySignups = Object.entries(analytics.usersByWeek || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([label, value]) => ({
      label: label.split('-W')[1] || label,
      value,
    }));

  const weeklyActivity = Object.entries(analytics.activityByWeek || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([label, value]) => ({
      label: label.split('-W')[1] || label,
      value,
    }));

  const totalUsers = analytics.totalUsers || 0;
  const safePercent = (value: number) => (totalUsers > 0 ? (value / totalUsers) * 100 : 0);

  const segmentPercentages: Record<string, number> = {
    power: safePercent(analytics.powerUsers),
    active: safePercent(analytics.activeUserSegment),
    casual: safePercent(analytics.casualUsers),
    'one-time': safePercent(analytics.oneTimeUsers),
    churned: safePercent(analytics.churnedUsers),
  };

  return {
    userSegmentData,
    retentionData,
    funnelData,
    datasetData,
    weeklySignups,
    weeklyActivity,
    segmentPercentages,
    segmentDefinitions,
  };
}

export async function fetchAnalyticsData(signal?: AbortSignal): Promise<AnalyticsData> {
  const response = await fetch('/api/analytics', { signal });
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
}

