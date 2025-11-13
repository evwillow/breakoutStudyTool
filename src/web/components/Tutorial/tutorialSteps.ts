/**
 * @fileoverview Tutorial step configuration.
 * @module src/web/components/Tutorial/tutorialSteps.ts
 * @dependencies ./steps
 */
import { welcomeStep } from './steps/welcome';
import { chartOverviewStep } from './steps/chartOverview';
import { timerExplanationStep } from './steps/timerExplanation';
import { makingSelectionStep } from './steps/makingSelection';
import { resultsFeedbackStep } from './steps/resultsFeedback';
import { roundHistoryStep } from './steps/roundHistory';
import { timerDurationStep } from './steps/timerDuration';
import { nextCardStep } from './steps/nextCard';
import { completionStep } from './steps/completion';

export interface TutorialStep {
  id: string;
  target: string | null; // CSS selector or null for center of screen
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | string;
  interactive?: boolean; // If true, user must interact with target to continue
  waitForAction?: string; // Action to wait for (e.g., 'chart-click')
  showTarget?: boolean; // If true, show the target element (make it visible) during this step
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  welcomeStep,
  chartOverviewStep,
  timerExplanationStep,
  makingSelectionStep,
  resultsFeedbackStep,
  roundHistoryStep,
  timerDurationStep,
  nextCardStep,
  completionStep,
];

