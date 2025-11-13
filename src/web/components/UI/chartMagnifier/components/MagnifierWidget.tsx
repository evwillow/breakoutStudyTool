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
  magnifierRef: React.RefObject<HTMLDivElement>;
  selectionBounds: SelectionBounds;
  targetPosition: Position;
  magnifierRenderPos: Position;
  magnifierSize: number;
  isDragging: boolean;
  isScrolling: boolean;
  isDraggingMagnifierWidget: boolean;
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
}) => {
  const renderPos = isDraggingMagnifierWidget
    ? magnifierRenderPos
    : getMagnifierRenderPosition(targetPosition, selectionBounds, magnifierSize);

  return (
    <div
      ref={magnifierRef}
      className="fixed z-30 pointer-events-auto"
      style={{
        left: `${selectionBounds.left + renderPos.x}px`,
        top: `${selectionBounds.top + renderPos.y}px`,
        width: `${magnifierSize}px`,
        height: `${magnifierSize}px`,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: (isDragging || isScrolling)
          ? 'none'
          : 'transform 0.15s ease-out',
        cursor: 'move',
        willChange: 'transform, left, top',
        touchAction: 'none',
      }}
    >
      <div
        className="absolute inset-0 rounded-md overflow-hidden pointer-events-none"
        style={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
      >
        <MagnifierCrosshair isDragging={isDragging} />
      </div>
    </div>
  );
};

export default MagnifierWidget;

