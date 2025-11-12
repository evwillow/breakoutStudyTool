/**
 * Analytics API Endpoint
 *
 * Provides comprehensive analytics data for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { getDetailedAnalytics, USER_SEGMENT_DEFINITIONS } from '@/analytics/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const analytics = await getDetailedAnalytics();

    // Convert Maps to objects for JSON serialization
    const response = {
      ...analytics,
      datasetUsage: Object.fromEntries(analytics.datasetUsage),
      usersByWeek: Object.fromEntries(analytics.usersByWeek),
      activityByWeek: Object.fromEntries(analytics.activityByWeek),
      segmentDefinitions: USER_SEGMENT_DEFINITIONS,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
