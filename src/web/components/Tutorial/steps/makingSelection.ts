/**
 * @fileoverview Making selection step configuration.
 * @module src/web/components/Tutorial/steps/makingSelection.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const makingSelectionStep: TutorialStep = {
  id: 'making-selection',
  target: '[data-tutorial-chart]',
  content: "To make a prediction, you would click in the highlighted area to the right. This is where you think the price will peak after the breakout. Click 'Next' to continue.",
  placement: 'bottom',
  interactive: false,
  waitForAction: undefined,
};

