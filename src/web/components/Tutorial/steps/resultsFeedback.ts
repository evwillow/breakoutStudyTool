/**
 * @fileoverview Results feedback step configuration.
 * @module src/web/components/Tutorial/steps/resultsFeedback.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const resultsFeedbackStep: TutorialStep = {
  id: 'results-feedback',
  target: '[data-tutorial-results]',
  content: "After your selection, you'll see your accuracy score. The system compares your prediction to the actual peak. Aim for 70%+ to be correct.",
  placement: 'top',
};

