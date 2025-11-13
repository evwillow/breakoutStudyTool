/**
 * @fileoverview Hook for managing chart magnifier position state and initialization.
 * @module src/web/components/UI/chartMagnifier/hooks/useChartMagnifierPosition.ts
 * @dependencies React, ../utils/magnifierUtils
 */
"use client";

import { useState, useEffect, useRef } from 'react';
import {
  constrainPosition,
  getMagnifierRenderPosition,
  type Position,
  type SelectionBounds,
} from '../utils/magnifierUtils';

interface UseChartMagnifierPositionProps {
  chartElement: HTMLElement | null;
  isMobile: boolean;
  selectionBounds: SelectionBounds | null;
  mainDataLength: number;
  magnifierSize: number;
}

interface UseChartMagnifierPositionReturn {
  targetPosition: Position;
  magnifierRenderPos: Position;
  hasBeenPositioned: boolean;
  setTargetPosition: React.Dispatch<React.SetStateAction<Position>>;
  setMagnifierRenderPos: React.Dispatch<React.SetStateAction<Position>>;
  targetPositionRef: React.MutableRefObject<Position>;
}

export function useChartMagnifierPosition({
  chartElement,
  isMobile,
  selectionBounds,
  mainDataLength,
  magnifierSize,
}: UseChartMagnifierPositionProps): UseChartMagnifierPositionReturn {
  const [targetPosition, setTargetPosition] = useState<Position>({ x: 0, y: 0 });
  const [magnifierRenderPos, setMagnifierRenderPos] = useState<Position>({ x: 0, y: 0 });
  const [hasBeenPositioned, setHasBeenPositioned] = useState(false);
  const targetPositionRef = useRef<Position>({ x: 0, y: 0 });
  const hasPositionedRef = useRef(false);

  // Keep targetPosition ref updated
  useEffect(() => {
    targetPositionRef.current = targetPosition;
  }, [targetPosition]);

  // Initialize position to prediction area (right side) when component mounts
  useEffect(() => {
    if (!chartElement || !isMobile || !selectionBounds) return;

    // Position in the prediction area (right side, where selections are made)
    const separatorX = selectionBounds.left + (selectionBounds.width * 0.85);
    let initialX = selectionBounds.width * 0.9; // Default to 90% from left (far right side)

    // Try to use actual separator if available
    const svgElement = chartElement.querySelector('svg');
    if (svgElement) {
      const lines = svgElement.querySelectorAll('line');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const x1 = parseFloat(line.getAttribute('x1') || '0');
        const x2 = parseFloat(line.getAttribute('x2') || '0');
        if (x1 === x2 && x1 > svgElement.getBoundingClientRect().width * 0.7) {
          const separatorXInSelection = (chartElement.getBoundingClientRect().left + x1) - selectionBounds.left;
          const predictionAreaWidth = selectionBounds.width - separatorXInSelection;
          initialX = separatorXInSelection + (predictionAreaWidth * 0.7);
          break;
        }
      }
    }

    const initialPos = constrainPosition(
      initialX,
      selectionBounds.height / 2,
      selectionBounds,
      chartElement,
      mainDataLength
    );
    
    setTargetPosition(initialPos);
    targetPositionRef.current = initialPos;
    const initialRenderPos = getMagnifierRenderPosition(initialPos, selectionBounds, magnifierSize);
    setMagnifierRenderPos(initialRenderPos);
    hasPositionedRef.current = true;
    setHasBeenPositioned(true);
  }, [chartElement, isMobile, selectionBounds, mainDataLength, magnifierSize]);

  return {
    targetPosition,
    magnifierRenderPos,
    hasBeenPositioned,
    setTargetPosition,
    setMagnifierRenderPos,
    targetPositionRef,
  };
}

