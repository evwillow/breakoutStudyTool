import React from "react";
import ChartSection from "../../ChartSection";

const TypedChartSection = ChartSection as React.ComponentType<any>;

interface ChartViewProps {
  orderedFiles: unknown[];
  afterData: unknown;
  pointsTextArray?: unknown[];
  timerDisplayValue: number;
  feedback: unknown;
  disabled: boolean;
  showTimeUp: boolean;
  onAfterEffectComplete: () => void;
  onChartClick: (...args: any[]) => void;
  userSelection: unknown;
  targetPoint: unknown;
  distance: number | null;
  score: number | null;
  onNextCard: () => void;
  timerDuration: number;
  onTimerDurationChange: (value: number) => void;
  onPauseStateChange: (paused: boolean) => void;
  onTimerPause: () => void;
  onDismissTooltip: () => void;
}

const ChartView: React.FC<ChartViewProps> = ({
  orderedFiles,
  afterData,
  pointsTextArray,
  timerDisplayValue,
  feedback,
  disabled,
  showTimeUp,
  onAfterEffectComplete,
  onChartClick,
  userSelection,
  targetPoint,
  distance,
  score,
  onNextCard,
  timerDuration,
  onTimerDurationChange,
  onPauseStateChange,
  onTimerPause,
  onDismissTooltip
}) => (
  <TypedChartSection
    orderedFiles={orderedFiles}
    afterData={afterData}
    timer={timerDisplayValue}
    pointsTextArray={pointsTextArray ?? []}
    feedback={feedback}
    disabled={disabled}
    isTimeUp={showTimeUp}
    onAfterEffectComplete={onAfterEffectComplete}
    onChartClick={onChartClick}
    userSelection={userSelection}
    targetPoint={targetPoint}
    distance={distance}
    score={score}
    onNextCard={onNextCard}
    timerDuration={timerDuration}
    onTimerDurationChange={onTimerDurationChange}
    onPauseStateChange={onPauseStateChange}
    onTimerPause={onTimerPause}
    onDismissTooltip={onDismissTooltip}
  />
);

export default React.memo(ChartView);

