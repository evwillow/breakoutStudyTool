/**
 * @fileoverview Results feedback step configuration.
 * @module src/web/components/Tutorial/steps/resultsFeedback.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const resultsFeedbackStep: TutorialStep = {
  id: 'results-feedback',
  target: '[data-tutorial-results]',
  content: "After you make your selection, you'll see your accuracy score. The system compares your prediction to the actual post-breakout high. Aim for 70%+ accuracy for a correct prediction.",
  placement: 'top',
};

