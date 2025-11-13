/**
 * @fileoverview Next card step configuration.
 * @module src/web/components/Tutorial/steps/nextCard.ts
 */
import type { TutorialStep } from '../tutorialSteps';

export const nextCardStep: TutorialStep = {
  id: 'next-card',
  target: '[data-tutorial-next]',
  content: "After reviewing your results, click Next to move to the next breakout pattern. Practice regularly to improve your pattern recognition skills.",
  placement: 'top',
};

