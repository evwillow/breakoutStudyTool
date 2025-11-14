/**
 * @fileoverview Chart overview step configuration.
 * @module src/web/components/Tutorial/steps/chartOverview.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const chartOverviewStep: TutorialStep = {
  id: 'chart-overview',
  target: '[data-tutorial-chart]',
  content: "This chart shows the price before the breakout. Your goal: predict where the price will peak after breaking out.",
  placement: 'bottom',
};

