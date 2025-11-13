import type { ChartCoordinate, ChartClickHandler } from '@breakout-study-tool/shared';

/**
 * Ordered file structure for chart data
 */
export interface OrderedFile {
  fileName: string;
  data: unknown;
}

/**
 * Feedback object structure
 */
export interface Feedback {
  [key: string]: unknown;
}

/**
 * Points text array item structure
 */
export interface PointsTextItem {
  [key: string]: unknown;
}

/**
 * Action button structure (deprecated)
 */
export interface ActionButton {
  [key: string]: unknown;
}

/**
 * Popup position structure
 */
export interface PopupPosition {
  top: string;
  left: string;
  right: string;
  bottom: string;
}

/**
 * Stock info structure
 */
export interface StockInfo {
  ticker: string | null;
  breakoutDate: string | null;
}

/**
 * ChartScoreOverlay component props
 */
export interface ChartScoreOverlayProps {
  score: number;
  accuracyTier: string;
  show: boolean;
  onNext: (() => void) | null;
  isMobile: boolean;
  alwaysPaused?: boolean;
  onPauseChange?: ((paused: boolean) => void) | null;
}

/**
 * ChartSection component props
 */
export interface ChartSectionProps {
  orderedFiles: OrderedFile[] | null | undefined;
  afterData: unknown | null;
  timer: number | null | undefined;
  pointsTextArray?: PointsTextItem[];
  actionButtons?: ActionButton[] | null; // Deprecated - kept for compatibility
  selectedButtonIndex?: number | null; // Deprecated - kept for compatibility
  feedback: Feedback | null | undefined;
  onButtonClick?: (() => void) | null; // Deprecated - kept for compatibility
  disabled?: boolean;
  isTimeUp?: boolean;
  onAfterEffectComplete?: (() => void) | null;
  onChartClick?: ChartClickHandler | null;
  userSelection?: ChartCoordinate | null;
  distance?: number | null;
  score?: number | null;
  targetPoint?: ChartCoordinate | null;
  onNextCard?: (() => void) | null;
  timerDuration?: number | null;
  onTimerDurationChange?: ((duration: number) => void) | null;
  onPauseStateChange?: ((paused: boolean) => void) | null;
  onDismissTooltip?: ((event: { reason: string }) => void) | null;
  onTimerPause?: (() => void) | null;
}

