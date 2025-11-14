/**
 * @fileoverview Making selection step configuration.
 * @module src/web/components/Tutorial/steps/makingSelection.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const makingSelectionStep: TutorialStep = {
  id: 'making-selection',
  target: '[data-tutorial-chart]',
  content: "Click on the highlighted area to predict where the price will peak. You can only click to the right of the last data point.",
  placement: 'bottom',
  interactive: true,
  waitForAction: 'chart-click',
};

