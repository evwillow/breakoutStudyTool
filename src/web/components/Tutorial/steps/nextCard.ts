/**
 * @fileoverview Next card step configuration.
 * @module src/web/components/Tutorial/steps/nextCard.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const nextCardStep: TutorialStep = {
  id: 'next-card',
  target: '[data-tutorial-next]',
  content: "To move to the next pattern, you would click 'Next Stock' here. Keep practicing to improve your skills. Click 'Next' to continue.",
  placement: 'top',
  interactive: false,
  waitForAction: undefined,
};

