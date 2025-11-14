/**
 * @fileoverview Next card step configuration.
 * @module src/web/components/Tutorial/steps/nextCard.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const nextCardStep: TutorialStep = {
  id: 'next-card',
  target: '[data-tutorial-next]',
  content: "Click Next Stock to move to the next pattern. Keep practicing to improve your skills.",
  placement: 'top',
  interactive: true,
  waitForAction: 'next-card-click',
};

