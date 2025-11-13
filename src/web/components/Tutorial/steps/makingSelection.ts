/**
 * @fileoverview Making selection step configuration.
 * @module src/web/components/Tutorial/steps/makingSelection.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const makingSelectionStep: TutorialStep = {
  id: 'making-selection',
  target: '[data-tutorial-chart]',
  content: "Click on the chart where you think the price will peak after the breakout. You can only select points in the future (to the right of the last data point).",
  placement: 'bottom',
  interactive: true,
  waitForAction: 'chart-click',
};

