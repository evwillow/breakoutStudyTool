/**
 * @fileoverview Client-side analytics dashboard rendering charts and metrics for administrators.
 * @module src/web/app/analytics/page.tsx
 * @dependencies React, @/lib/hooks/useAuthRedirect, @/components/Analytics/AnalyticsChart, @breakout-study-tool/shared
 */
"use client";

import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

const MetricCard = dynamic(
  () => import("@/components/Analytics/AnalyticsChart").then((mod) => mod.MetricCard),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("@/components/Analytics/AnalyticsChart").then((mod) => mod.BarChart),
  { ssr: false }
);
const DonutChart = dynamic(
  () => import("@/components/Analytics/AnalyticsChart").then((mod) => mod.DonutChart),
  { ssr: false }
);
const LineChart = dynamic(
  () => import("@/components/Analytics/AnalyticsChart").then((mod) => mod.LineChart),
  { ssr: false }
);
const AreaChartComponent = dynamic(
  () => import("@/components/Analytics/AnalyticsChart").then((mod) => mod.AreaChartComponent),
  { ssr: false }
);

import type { AnalyticsData } from '@breakout-study-tool/shared';
import { buildAnalyticsViewModel, fetchAnalyticsData } from "@/services/analytics/analyticsService";

/**
 * Analytics Page
 *
 * Comprehensive analytics dashboard with enhanced visualizations and user segment definitions.
 */
export default function AnalyticsPage() {
  const { session, isLoading } = useAuthRedirect();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  const {
    data: analytics,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const data = await fetchAnalyticsData();
      return data as AnalyticsData;
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Unknown error' : null;

  if (isLoading || loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black z-40" />
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-6">
            <div className="animate-spin rounded-md h-20 w-20 border-t-2 border-r-2 border-b-2 border-turquoise-400 border-t-transparent"></div>
            <p className="text-white text-lg">Loading Analytics...</p>
          </div>
        </div>
      </>
    );
  }

  if (!session) return null;

  if (error) {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[75%] max-w-[1400px] px-4 py-16">
          <div className="bg-red-500/20 text-white px-8 py-10 rounded-md backdrop-blur-md border border-red-400/30">
            <p className="text-lg text-center">Error loading analytics: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const viewModel = useMemo(
    () => buildAnalyticsViewModel(analytics),
    [analytics]
  );

  return (
    <div className="w-full flex justify-center min-h-screen pb-16">
      <div className="w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-extrabold text-center bg-gradient-to-r from-turquoise-200 via-white to-turquoise-200 bg-clip-text text-transparent mb-3">
            Analytics Dashboard
          </h1>
          <p className="text-center text-white/70 text-lg">
            Comprehensive insights into user engagement and platform performance
          </p>
        </div>

        {/* Key Metrics - Primary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Users"
            value={analytics.totalUsers}
            subtitle={`${analytics.verifiedUsers} verified`}
            color="turquoise"
            tooltip="Total number of registered users in the system"
          />
          <MetricCard
            title="Active Users"
            value={analytics.activeUsers}
            subtitle="Last 7 days"
            color="green"
            tooltip="Users who have been active in the past 7 days"
          />
          <MetricCard
            title="Activation Rate"
            value={`${analytics.activationRate.toFixed(1)}%`}
            subtitle={`${analytics.signUpToFirstRound} activated`}
            color="blue"
            tooltip="Percentage of users who completed their first round after signing up"
          />
          <MetricCard
            title="Power Users"
            value={analytics.powerUsers}
            subtitle="10+ rounds completed"
            color="purple"
            tooltip="Highly engaged users who have completed 10 or more rounds"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Avg. Accuracy"
            value={`${analytics.averageAccuracy.toFixed(1)}%`}
            subtitle="Across all matches"
            color="pink"
            tooltip="Average accuracy percentage across all user matches"
          />
          <MetricCard
            title="Completion Rate"
            value={`${analytics.completionRate.toFixed(1)}%`}
            subtitle="Rounds completed"
            color="green"
            tooltip="Percentage of started rounds that were completed"
          />
          <MetricCard
            title="Day 7 Retention"
            value={`${analytics.day7Retention.toFixed(1)}%`}
            subtitle="Users returning"
            color="turquoise"
            tooltip="Percentage of users who return within 7 days of signup"
          />
          <MetricCard
            title="Avg. Rounds/User"
            value={analytics.averageRoundsPerUser.toFixed(1)}
            subtitle={`${analytics.averageMatchesPerUser.toFixed(1)} matches/user`}
            color="blue"
            tooltip="Average number of rounds and matches per active user"
          />
        </div>

        {/* User Segments Section with Definitions */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/15">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">User Segments</h2>
              <p className="text-white/70 text-sm">
                Understanding your user base through engagement-based segmentation
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DonutChart data={viewModel.userSegmentData} title="" centerText="Total Users" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white/90 mb-4">
                  Segment Definitions
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {viewModel.userSegmentData.map((segment, index) => {
                    const segmentKey = segment.label.toLowerCase().includes('power')
                      ? 'power'
                      : segment.label.toLowerCase().includes('active') && !segment.label.includes('(4-9)')
                      ? 'active'
                      : segment.label.toLowerCase().includes('casual')
                      ? 'casual'
                      : segment.label.toLowerCase().includes('one-time')
                      ? 'one-time'
                      : 'churned';
                    const def = viewModel.segmentDefinitions?.[segmentKey];
                    const percentage = viewModel.segmentPercentages[segmentKey] || 0;
                    const isSelected = selectedSegment === segmentKey;

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/20 border-white/40'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                        onClick={() => setSelectedSegment(isSelected ? null : segmentKey)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-sm ${segment.color}`} />
                            <h4 className="font-semibold text-white">{segment.label}</h4>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">{segment.value}</div>
                            <div className="text-xs text-white/60">{percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        {def && (
                          <div className={`mt-2 text-sm text-white/70 ${isSelected ? '' : 'line-clamp-2'}`}>
                            <p className="mb-1">
                              <span className="font-medium">Criteria:</span> {def.criteria}
                            </p>
                            <p>{def.description}</p>
                            {def.targetPercentage && (
                              <p className="mt-2 text-xs text-white/60">
                                Target: {def.targetPercentage.min}% - {def.targetPercentage.max}% of
                                user base
                                {percentage < def.targetPercentage.min && (
                                  <span className="text-yellow-400 ml-2">(Below target)</span>
                                )}
                                {percentage > def.targetPercentage.max && (
                                  <span className="text-green-400 ml-2">(Above target)</span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Retention Rates */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/15">
            <BarChart data={viewModel.retentionData} title="Retention Rates" color="green" />
          </div>

          {/* User Journey Funnel */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/15">
            <BarChart data={viewModel.funnelData} title="User Journey Funnel" color="purple" />
          </div>
        </div>

        {/* Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/15">
            <AreaChartComponent
              data={viewModel.weeklySignups}
              title="Weekly Sign-ups (Last 12 Weeks)"
              color="turquoise"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/15">
            <AreaChartComponent
              data={viewModel.weeklyActivity}
              title="Weekly Activity (Last 12 Weeks)"
              color="blue"
            />
          </div>
        </div>

        {/* Dataset Usage */}
        {viewModel.datasetData.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/15 mb-8">
            <BarChart data={viewModel.datasetData} title="Top Dataset Usage" color="pink" />
          </div>
        )}

        {/* Key Insights */}
        <div className="mt-8 bg-gradient-to-br from-turquoise-500/20 to-blue-600/20 backdrop-blur-sm rounded-lg p-6 border border-turquoise-400/30">
          <h3 className="text-2xl font-bold text-white mb-6">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <p className="font-semibold text-turquoise-300 mb-2">User Engagement</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                <li>
                  {((analytics.powerUsers / analytics.totalUsers) * 100).toFixed(1)}% of users are
                  Power Users
                </li>
                <li>{analytics.activeUsers} users active in the last week</li>
                <li>{analytics.monthlyActiveUsers} monthly active users</li>
                <li>
                  {analytics.casualUsers + analytics.activeUserSegment + analytics.powerUsers}{' '}
                  users have completed 2+ rounds
                </li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <p className="font-semibold text-blue-300 mb-2">Performance Metrics</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                <li>
                  Average activation time: {analytics.averageActivationTime.toFixed(1)} days
                </li>
                <li>
                  First to second round conversion: {analytics.firstToSecondRoundRate.toFixed(1)}%
                </li>
                <li>
                  Second to third round conversion: {analytics.secondToThirdRoundRate.toFixed(1)}%
                </li>
                <li>
                  Third to power user conversion: {analytics.thirdToPowerUserRate.toFixed(1)}%
                </li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <p className="font-semibold text-green-300 mb-2">Retention Analysis</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                <li>Day 1 retention: {analytics.day1Retention.toFixed(1)}%</li>
                <li>Day 7 retention: {analytics.day7Retention.toFixed(1)}%</li>
                <li>Day 30 retention: {analytics.day30Retention.toFixed(1)}%</li>
                <li>
                  {analytics.churnedUsers} users have churned (30+ days inactive)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
