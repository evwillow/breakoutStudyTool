/**
 * Simplified Analytics Dashboard
 */

import { getValidationMetrics, getUserBehaviorAnalytics } from './analytics';

async function generateSimpleReport(trafficData?: { totalVisitors: number; source?: string }): Promise<string> {
  const validation = await getValidationMetrics(trafficData);
  const behavior = await getUserBehaviorAnalytics();

  // Parse GA data if available
  let gaData: any = null;
  try {
    if (process.env.GA_DATA) {
      gaData = JSON.parse(process.env.GA_DATA);
    }
  } catch (e) {
    // Ignore parse errors
  }

  const signUpRate = validation.signUpRate ? `${validation.signUpRate.toFixed(1)}%` : 'N/A';
  const activationStatus = validation.activationRate >= 30 ? 'STRONG' : validation.activationRate >= 10 ? 'MODERATE' : 'LOW';
  const retentionStatus = behavior.day7Retention >= 40 ? 'STRONG' : behavior.day7Retention >= 20 ? 'MODERATE' : 'LOW';

  const report = `
================================================================================
                            ANALYTICS SUMMARY
================================================================================

KEY METRICS
--------------------------------------------------------------------------------
  Sign-ups:              ${validation.totalSignUps}
  Sign-up Rate:          ${signUpRate}${trafficData?.source ? ` (from ${trafficData.source})` : ''}
  Activation Rate:       ${validation.activationRate.toFixed(1)}% (${activationStatus})
  Day 7 Retention:       ${behavior.day7Retention.toFixed(1)}% (${retentionStatus})
  Power Users (10+):     ${behavior.powerUsers}
  Average Accuracy:       ${validation.averageAccuracy.toFixed(1)}%
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

ENGAGEMENT
--------------------------------------------------------------------------------
  Users with Rounds:      ${validation.usersWithRounds} (${((validation.usersWithRounds / validation.totalSignUps) * 100).toFixed(1)}%)
  Avg Rounds/User:        ${validation.averageRoundsPerUser.toFixed(1)}
  Avg Matches/Round:      ${validation.averageMatchesPerRound.toFixed(1)}
  Completion Rate:        ${validation.completionRate.toFixed(1)}%

RETENTION
--------------------------------------------------------------------------------
  Day 1:                 ${behavior.day1Retention.toFixed(1)}%
  Day 7:                 ${behavior.day7Retention.toFixed(1)}%
  Day 30:                ${behavior.day30Retention.toFixed(1)}%
  Weekly Active:         ${behavior.weeklyActiveUsers}
  Churned (30+ days):    ${behavior.churnedUsers}

FUNNEL
--------------------------------------------------------------------------------
  Sign-up → First Round:  ${behavior.signUpToFirstRound} (${validation.activationRate.toFixed(1)}%)
  First → Second:         ${behavior.firstRoundToSecondRound.toFixed(1)}%
  Second → Third:         ${behavior.secondRoundToThirdRound.toFixed(1)}%
  Third → Power User:     ${behavior.thirdRoundToPowerUser.toFixed(1)}%

RECOMMENDATIONS
--------------------------------------------------------------------------------
${getTopRecommendations(validation, behavior)}
`;

  return report;
}

function getTopRecommendations(validation: any, behavior: any): string {
  const recs: string[] = [];

  if (validation.activationRate < 30) {
    recs.push(`• ACTIVATION (${validation.activationRate.toFixed(1)}%): Focus on first-use value`);
    if (validation.activationRate < 10) {
      recs.push('  - Build "wow moment" within 30 seconds');
      recs.push('  - Simplify onboarding');
    }
  }

  if (behavior.day7Retention < 40) {
    recs.push(`• RETENTION (${behavior.day7Retention.toFixed(1)}%): Improve engagement loops`);
    recs.push('  - Add progress tracking');
    recs.push('  - Create habit-forming features');
  }

  if (behavior.oneTimeUsers > behavior.powerUsers) {
    recs.push('• ENGAGEMENT: More one-time than power users');
    recs.push('  - Improve feature discoverability');
    recs.push('  - Add variety and progression');
  }

  if (behavior.firstRoundToSecondRound < 50) {
    recs.push('• FUNNEL: Low first-to-second conversion');
    recs.push('  - Improve first-round experience');
    recs.push('  - Add clear next steps');
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
