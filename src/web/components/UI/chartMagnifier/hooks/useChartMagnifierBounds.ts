/**
 * @fileoverview Hook for managing chart magnifier bounds calculations.
 * @module src/web/components/UI/chartMagnifier/hooks/useChartMagnifierBounds.ts
 * @dependencies ../utils/magnifierUtils
 */
"use client";

import { useMemo } from 'react';
import {
  getSelectionAreaBounds,
  getSeparatorX,
  isInSelectableArea,
  type SelectionBounds,
} from '../utils/magnifierUtils';

interface UseChartMagnifierBoundsProps {
  chartElement: HTMLElement | null;
  mainDataLength: number;
}

interface UseChartMagnifierBoundsReturn {
  selectionBounds: SelectionBounds | null;
  separatorX: number | null;
  isInSelectableArea: (clientX: number) => boolean;
}

export function useChartMagnifierBounds({
  chartElement,
  mainDataLength,
}: UseChartMagnifierBoundsProps): UseChartMagnifierBoundsReturn {
  const selectionBounds = useMemo(
    () => getSelectionAreaBounds(chartElement),
    [chartElement]
  );

  const separatorX = useMemo(
    () => getSeparatorX(chartElement, mainDataLength),
    [chartElement, mainDataLength]
  );

  const checkIsInSelectableArea = useMemo(
    () => (clientX: number) => isInSelectableArea(clientX, chartElement, mainDataLength),
    [chartElement, mainDataLength]
  );

  return {
    selectionBounds,
    separatorX,
    isInSelectableArea: checkIsInSelectableArea,
  };
}

