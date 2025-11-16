/**
 * @fileoverview Main magnifier widget component.
 * @module src/web/components/UI/chartMagnifier/components/MagnifierWidget.tsx
 * @dependencies React, ./MagnifierCrosshair, ../utils/magnifierUtils
 */
"use client";

import React from 'react';
import MagnifierCrosshair from './MagnifierCrosshair';
import { getMagnifierRenderPosition, type Position, type SelectionBounds } from '../utils/magnifierUtils';

interface MagnifierWidgetProps {
  magnifierRef: React.RefObject<HTMLDivElement | null>;
  selectionBounds: SelectionBounds;
  targetPosition: Position;
  magnifierRenderPos: Position;
  magnifierSize: number;
  isDragging: boolean;
  isScrolling: boolean;
  isDraggingMagnifierWidget: boolean;
  isTutorialMode?: boolean;
}

export const MagnifierWidget: React.FC<MagnifierWidgetProps> = ({
  magnifierRef,
  selectionBounds,
  targetPosition,
  magnifierRenderPos,
  magnifierSize,
  isDragging,
  isScrolling,
  isDraggingMagnifierWidget,
  isTutorialMode = false,
}) => {
  // Use direct render position during drag, otherwise calculate from target
  const renderPos = isDraggingMagnifierWidget
    ? magnifierRenderPos
    : getMagnifierRenderPosition(targetPosition, selectionBounds, magnifierSize);

  return (
    <div
      ref={magnifierRef}
      className="fixed z-30 pointer-events-auto"
      style={{
        // These will be overridden by direct DOM manipulation during drag,
        // but provide fallback for initial render and non-drag states
        left: `${selectionBounds.left + renderPos.x}px`,
        top: `${selectionBounds.top + renderPos.y}px`,
        width: `${magnifierSize}px`,
        height: `${magnifierSize}px`,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: (isDragging || isScrolling)
          ? 'none'
          : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'move',
        // CRITICAL: GPU acceleration optimizations for buttery smooth mobile dragging
        willChange: 'transform, left, top',
        touchAction: 'none',
        // Force GPU layer for smooth compositing
        backfaceVisibility: 'hidden' as const,
        WebkitBackfaceVisibility: 'hidden' as const,
        perspective: 1000,
        WebkitPerspective: 1000,
        // Optimize for performance
        contain: 'layout style paint' as const,
      }}
    >
      <div
        className="absolute inset-0 rounded-md overflow-hidden pointer-events-none"
        style={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          // Additional GPU acceleration
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
        <MagnifierCrosshair isDragging={isDragging} />

        {/* Tutorial mode indicator - pulsing ring */}
        {isTutorialMode && !isDragging && (
          <>
            <div
              className="absolute inset-0 rounded-md border-2 border-turquoise-400 pointer-events-none"
              style={{
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-turquoise-600 bg-white/90 px-2 py-1 rounded shadow-sm pointer-events-none"
              style={{
                transform: 'translateX(-50%) translateZ(0)',
              }}
            >
              Drag to position
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MagnifierWidget;

