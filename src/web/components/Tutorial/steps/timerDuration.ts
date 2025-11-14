/**
 * @fileoverview Timer duration step configuration.
 * @module src/web/components/Tutorial/steps/timerDuration.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const timerDurationStep: TutorialStep = {
  id: 'timer-duration',
  target: '[data-tutorial-timer-duration]',
  content: "Adjust the timer to match your skill level. Shorter timers are harder. Start with longer durations and work your way down.",
  placement: 'bottom',
};

