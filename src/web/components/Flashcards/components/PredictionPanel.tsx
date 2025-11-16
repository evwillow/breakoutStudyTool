/**
 * @fileoverview Prediction UI panel for chart interaction and selection feedback.
 * @module src/web/components/Flashcards/components/PredictionPanel.tsx
 * @dependencies React
 */
"use client";

import React from "react";
import SelectionTooltip from "../../UI/SelectionTooltip";
import type { ChartCoordinate } from '@breakout-study-tool/shared';

export interface PredictionPanelProps {
  /** User's selected coordinates on the chart */
  userSelection?: ChartCoordinate | null;
  /** Target point coordinates for comparison */
  targetPoint?: ChartCoordinate | null;
  /** Distance from target (for display) */
  distance?: number | null;
  /** Current score/accuracy */
  score?: number | null;
  /** Feedback object with selection state */
  feedback?: any;
  /** Whether interactions are disabled */
  disabled?: boolean;
  /** Callback when tooltip is dismissed */
  onDismissTooltip?: (event?: { reason?: string }) => void;
  /** Whether time is up */
  showTimeUp?: boolean;
}

/**
 * PredictionPanel Component
 * Handles the UI for user predictions, selection tooltips, and feedback display
 */
export const PredictionPanel: React.FC<PredictionPanelProps> = ({
  userSelection,
  targetPoint,
  distance,
  score,
  feedback,
  disabled,
  onDismissTooltip,
  showTimeUp = false,
}) => {
  // Show selection tooltip when user has made a selection but no score yet
  const showSelectionTooltip = 
    userSelection && 
    !disabled && 
    (score === null || score === undefined) &&
    !showTimeUp;

  // Show time-up tooltip
  const showTimeUpTooltip = showTimeUp && !feedback;

  if (!showSelectionTooltip && !showTimeUpTooltip) {
    return null;
  }

  return (
    <>
      {showSelectionTooltip && (
        <SelectionTooltip
          show={true}
          onDismiss={onDismissTooltip ? (event) => onDismissTooltip(event) : null}
        />
      )}
      {showTimeUpTooltip && (
        <SelectionTooltip
          show={true}
          onDismiss={onDismissTooltip ? (event) => onDismissTooltip(event) : null}
        />
      )}
    </>
  );
};

export default PredictionPanel;

