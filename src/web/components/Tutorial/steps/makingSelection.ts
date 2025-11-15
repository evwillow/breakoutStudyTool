/**
 * @fileoverview Making selection step configuration.
 * @module src/web/components/Tutorial/steps/makingSelection.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const makingSelectionStep: TutorialStep = {
  id: 'making-selection',
  target: '[data-tutorial-chart]',
  content: "Click in the highlighted area to the right to make your prediction. This is where you think the price will peak after the breakout.",
  placement: 'bottom',
  interactive: true,
  waitForAction: 'chart-click',
};

