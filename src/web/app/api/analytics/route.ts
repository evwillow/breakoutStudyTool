/**
 * @fileoverview Provides aggregated analytics metrics for the admin dashboard.
 * @module src/web/app/api/analytics/route.ts
 * @dependencies next/server, @/analytics/core
 */
/**
 * Analytics API Endpoint
 *
 * Provides comprehensive analytics data for the admin dashboard.
 *
 */

import { NextRequest } from 'next/server';
import { success, error } from '@/lib/api/responseHelpers';
import { getAnalyticsApiPayload } from '@/services/analytics/analyticsService';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const analytics = await getAnalyticsApiPayload();
    return success(analytics);
  } catch (error) {
    console.error('Analytics API error:', error);
    return error('Failed to fetch analytics data', 500);
  }
}
