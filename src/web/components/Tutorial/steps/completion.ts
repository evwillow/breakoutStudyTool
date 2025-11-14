/**
 * @fileoverview Completion step configuration.
 * @module src/web/components/Tutorial/steps/completion.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const completionStep: TutorialStep = {
  id: 'completion',
  target: '[data-tutorial-profile]',
  content: "You're all set! You can replay this tutorial anytime from your profile menu. Happy practicing!",
  placement: 'bottom',
};

