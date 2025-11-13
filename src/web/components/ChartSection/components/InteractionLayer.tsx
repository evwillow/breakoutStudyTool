/**
 * @fileoverview Interaction layer component for chart magnifier and tooltips.
 * @module src/web/components/ChartSection/components/InteractionLayer.tsx
 * @dependencies React, ../UI/ChartMagnifier, ../UI/SelectionTooltip
 */
"use client";

import React from "react";
import ChartMagnifier from "../../UI/ChartMagnifier";
import SelectionTooltip from "../../UI/SelectionTooltip";
import type { UseChartInteractionReturn } from "../hooks/useChartInteraction";

export interface InteractionLayerProps {
  interaction: UseChartInteractionReturn;
  onChartClick: ((coordinates: { x: number; y: number; chartX: number; chartY: number }) => void) | null;
  disabled: boolean;
  score: number | null;
  isTimeUp: boolean;
  orderedFiles: unknown[] | null | undefined;
  onDismissTooltip?: ((event: { reason: string }) => void) | null;
  timerDuration?: number | null;
  isMobile: boolean;
}

export const InteractionLayer: React.FC<InteractionLayerProps> = ({
  interaction,
  onChartClick,
  disabled,
  score,
  isTimeUp,
  orderedFiles,
  onDismissTooltip,
  timerDuration,
  isMobile,
}) => {
  return (
    <>
      {/* Magnifying glass tool */}
      {onChartClick && !disabled && score === null && !isTimeUp && (
        <ChartMagnifier
          onSelection={interaction.handleMagnifierSelection}
          enabled={!disabled && score === null && !isTimeUp}
          chartElement={interaction.chartRef.current as any}
          mainDataLength={interaction.mainDataLength}
        />
      )}
      {/* Time up tooltip */}
      {isTimeUp && score === null && (
        React.createElement(SelectionTooltip as any, {
          show: true,
          onDismiss: (event: { reason: string }) => onDismissTooltip?.(event),
          style: {
            top: isMobile ? '12px' : '18px',
            right: isMobile ? '12px' : '18px',
            maxWidth: isMobile ? '200px' : '240px',
          },
          durationSeconds: timerDuration
        })
      )}
    </>
  );
};

export default InteractionLayer;

