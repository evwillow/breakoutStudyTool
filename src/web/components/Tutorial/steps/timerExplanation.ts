/**
 * @fileoverview Timer explanation step configuration.
 * @module src/web/components/Tutorial/steps/timerExplanation.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const timerExplanationStep: TutorialStep = {
  id: 'timer-explanation',
  target: '[data-tutorial-timer]',
  content: "The timer keeps your practice sessions fast-paced. You have limited time to analyze and make your prediction. This builds quick decision-making skills essential for trading.",
  placement: 'bottom',
};

