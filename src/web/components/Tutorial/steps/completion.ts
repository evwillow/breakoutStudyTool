/**
 * @fileoverview Completion step configuration.
 * @module src/web/components/Tutorial/steps/completion.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const completionStep: TutorialStep = {
  id: 'completion',
  target: '[data-tutorial-profile]',
  content: "Great job! You can replay this tutorial anytime from your profile dropdown menu. Happy trading!",
  placement: 'bottom',
};

