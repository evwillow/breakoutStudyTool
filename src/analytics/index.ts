/**
 * Simplified Analytics Dashboard (CLI)
 *
 * For detailed analytics, use the web dashboard at /analytics
 */

import { getDetailedAnalytics } from './core';

async function generateSimpleReport(trafficData?: { totalVisitors: number; source?: string }): Promise<string> {
  const analytics = await getDetailedAnalytics();

  // Parse GA data if available
  let gaData: any = null;
  try {
    if (process.env.GA_DATA) {
      gaData = JSON.parse(process.env.GA_DATA);
    }
  } catch (e) {
    // Ignore parse errors
  }

  const signUpRate = trafficData?.totalVisitors
    ? `${((analytics.totalUsers / trafficData.totalVisitors) * 100).toFixed(1)}%`
    : 'N/A';
  const activationStatus = analytics.activationRate >= 30 ? 'STRONG' : analytics.activationRate >= 10 ? 'MODERATE' : 'LOW';
  const retentionStatus = analytics.day7Retention >= 40 ? 'STRONG' : analytics.day7Retention >= 20 ? 'MODERATE' : 'LOW';

  const report = `
================================================================================
                            ANALYTICS SUMMARY
================================================================================

KEY METRICS
--------------------------------------------------------------------------------
  Total Users:           ${analytics.totalUsers} (${analytics.verifiedUsers} verified)
  Sign-up Rate:          ${signUpRate}${trafficData?.source ? ` (from ${trafficData.source})` : ''}
  Activation Rate:       ${analytics.activationRate.toFixed(1)}% (${activationStatus})
  Day 7 Retention:       ${analytics.day7Retention.toFixed(1)}% (${retentionStatus})
  Average Accuracy:      ${analytics.averageAccuracy.toFixed(1)}%
${gaData ? `
TRAFFIC (Google Analytics - Last ${gaData.period_days} days)
--------------------------------------------------------------------------------
  Total Users:           ${gaData.total_users}
  Sessions:              ${gaData.sessions}
  Page Views:            ${gaData.page_views}
  Bounce Rate:           ${gaData.bounce_rate.toFixed(1)}%
  Avg Session Duration:  ${Math.round(gaData.avg_session_duration)}s
  New Users:             ${gaData.new_users}
${gaData.sources && gaData.sources.length > 0 ? `
  Top Traffic Sources:
${gaData.sources.slice(0, 5).map((s: any) => `    ${s.source}: ${s.sessions} sessions (${s.users} users)`).join('\n')}` : ''}` : ''}

USER SEGMENTS
--------------------------------------------------------------------------------
  Power Users (10+):     ${analytics.powerUsers} (${((analytics.powerUsers / analytics.totalUsers) * 100).toFixed(1)}%)
  Active Users (4-9):    ${analytics.activeUserSegment} (${((analytics.activeUserSegment / analytics.totalUsers) * 100).toFixed(1)}%)
  Casual Users (2-3):    ${analytics.casualUsers} (${((analytics.casualUsers / analytics.totalUsers) * 100).toFixed(1)}%)
  One-Time Users:        ${analytics.oneTimeUsers} (${((analytics.oneTimeUsers / analytics.totalUsers) * 100).toFixed(1)}%)
  Churned Users:         ${analytics.churnedUsers} (${((analytics.churnedUsers / analytics.totalUsers) * 100).toFixed(1)}%)

ENGAGEMENT
--------------------------------------------------------------------------------
  Active Users (7d):     ${analytics.activeUsers}
  Monthly Active:        ${analytics.monthlyActiveUsers}
  Avg Rounds/User:       ${analytics.averageRoundsPerUser.toFixed(1)}
  Avg Matches/User:      ${analytics.averageMatchesPerUser.toFixed(1)}
  Completion Rate:       ${analytics.completionRate.toFixed(1)}%

RETENTION
--------------------------------------------------------------------------------
  Day 1:                 ${analytics.day1Retention.toFixed(1)}%
  Day 7:                 ${analytics.day7Retention.toFixed(1)}%
  Day 30:                ${analytics.day30Retention.toFixed(1)}%
  Weekly Active:         ${analytics.weeklyActiveUsers}
  Monthly Active:        ${analytics.monthlyActiveUsers}
  Churned (30+ days):    ${analytics.churnedUsers}

FUNNEL
--------------------------------------------------------------------------------
  Sign-up → First Round: ${analytics.signUpToFirstRound} (${analytics.activationRate.toFixed(1)}%)
  First → Second:        ${analytics.firstToSecondRoundRate.toFixed(1)}%
  Second → Third:        ${analytics.secondToThirdRoundRate.toFixed(1)}%
  Third → Power User:    ${analytics.thirdToPowerUserRate.toFixed(1)}%

RECOMMENDATIONS
--------------------------------------------------------------------------------
${getTopRecommendations(analytics)}
`;

  return report;
}

function getTopRecommendations(analytics: any): string {
  const recs: string[] = [];

  if (analytics.activationRate < 30) {
    recs.push(`• ACTIVATION (${analytics.activationRate.toFixed(1)}%): Focus on first-use value`);
    if (analytics.activationRate < 10) {
      recs.push('  - Build "wow moment" within 30 seconds');
      recs.push('  - Simplify onboarding');
    }
  }

  if (analytics.day7Retention < 40) {
    recs.push(`• RETENTION (${analytics.day7Retention.toFixed(1)}%): Improve engagement loops`);
    recs.push('  - Add progress tracking');
    recs.push('  - Create habit-forming features');
  }

  if (analytics.oneTimeUsers > analytics.powerUsers) {
    recs.push('• ENGAGEMENT: More one-time than power users');
    recs.push('  - Improve feature discoverability');
    recs.push('  - Add variety and progression');
  }

  if (analytics.firstToSecondRoundRate < 50) {
    recs.push('• FUNNEL: Low first-to-second conversion');
    recs.push('  - Improve first-round experience');
    recs.push('  - Add clear next steps');
  }

  const powerUserPercentage = (analytics.powerUsers / analytics.totalUsers) * 100;
  if (powerUserPercentage < 5) {
    recs.push('• POWER USERS: Low power user ratio (<5%)');
    recs.push('  - Increase content variety');
    recs.push('  - Add progression systems and achievements');
  }

  if (recs.length === 0) {
    recs.push('• Metrics look strong! Double down on what\'s working.');
  }

  return recs.join('\n');
}

// CLI execution
if (require.main === module) {
  (async () => {
    try {
      const trafficData = process.env.TRAFFIC_VISITORS 
        ? { 
            totalVisitors: parseInt(process.env.TRAFFIC_VISITORS), 
            source: process.env.TRAFFIC_SOURCE || 'organic'
          }
        : undefined;

      const report = await generateSimpleReport(trafficData);
      console.log(report);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}
