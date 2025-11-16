/**
 * @fileoverview Shared analytics type definitions for dashboards and segmentation.
 * @module lib/shared/src/types/analytics.ts
 * @dependencies none
 */
/**
 * Analytics Types
 * 
 * Centralized type definitions for analytics, metrics, and user segmentation.
 */

/**
 * User segment type
 */
export type UserSegment = 'power' | 'active' | 'casual' | 'one-time' | 'churned' | 'new';

/**
 * User segment definition
 */
export interface UserSegmentDefinition {
  type: UserSegment;
  name: string;
  description: string;
  criteria: string;
  targetPercentage?: { min: number; max: number };
  color: string;
  icon?: string;
}

/**
 * User metrics
 */
export interface UserMetrics {
  userId: string;
  email: string;
  segment: UserSegment;
  totalRounds: number;
  completedRounds: number;
  totalMatches: number;
  averageAccuracy: number;
  daysSinceSignUp: number;
  daysSinceLastActivity: number;
  activationTime: number; // Days to first round
  isActive: boolean; // Active in last 7 days
  lastActivityDate: string | null;
  signUpDate: string;
}

/**
 * Analytics metrics
 */
export interface AnalyticsMetrics {
  // User metrics
  totalUsers: number;
  verifiedUsers: number;
  activeUsers: number; // Active in last 7 days

  // User segments
  powerUsers: number;
  activeUserSegment: number;
  casualUsers: number;
  oneTimeUsers: number;
  churnedUsers: number;

  // Engagement metrics
  activationRate: number; // % users who complete first round
  averageActivationTime: number; // Days to first round
  completionRate: number; // % of started rounds that are completed
  averageRoundsPerUser: number;
  averageMatchesPerUser: number;
  averageAccuracy: number;

  // Retention metrics
  day1Retention: number; // % returning after 1 day
  day7Retention: number; // % returning within 7 days
  day30Retention: number; // % returning within 30 days
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;

  // Funnel metrics
  signUpToFirstRound: number; // Count
  firstToSecondRoundRate: number; // %
  secondToThirdRoundRate: number; // %
  thirdToPowerUserRate: number; // %

  // Dataset popularity
  datasetUsage: Map<string, number>;

  // Time-based trends
  usersByWeek: Map<string, number>;
  activityByWeek: Map<string, number>;
}

/**
 * Detailed user analytics (includes user details)
 */
export interface DetailedUserAnalytics extends AnalyticsMetrics {
  userDetails: UserMetrics[];
}

/**
 * Analytics data (for frontend display)
 */
export interface AnalyticsData {
  totalUsers: number;
  verifiedUsers: number;
  activeUsers: number;
  powerUsers: number;
  activeUserSegment: number;
  casualUsers: number;
  oneTimeUsers: number;
  churnedUsers: number;
  activationRate: number;
  averageActivationTime: number;
  completionRate: number;
  averageRoundsPerUser: number;
  averageMatchesPerUser: number;
  averageAccuracy: number;
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  signUpToFirstRound: number;
  firstToSecondRoundRate: number;
  secondToThirdRoundRate: number;
  thirdToPowerUserRate: number;
  datasetUsage: Record<string, number>;
  usersByWeek: Record<string, number>;
  activityByWeek: Record<string, number>;
  segmentDefinitions?: Record<string, SegmentDefinition>;
}

/**
 * Segment definition (for frontend display)
 */
export interface SegmentDefinition {
  name: string;
  description: string;
  criteria: string;
  targetPercentage?: { min: number; max: number };
  color: string;
}

