/**
 * @fileoverview Crosshair overlay component for chart magnifier.
 * @module src/web/components/UI/chartMagnifier/components/MagnifierCrosshair.tsx
 * @dependencies React
 */
"use client";

import React from 'react';

interface MagnifierCrosshairProps {
  isDragging: boolean;
}

export const MagnifierCrosshair: React.FC<MagnifierCrosshairProps> = ({ isDragging }) => {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ willChange: 'opacity' }}>
      {/* Horizontal line */}
      <div
        className="absolute top-1/2 left-0 right-0 h-px bg-turquoise-400"
        style={{
          transform: 'translateY(-50%) translateZ(0)',
          opacity: isDragging ? 0.7 : 0.5,
          transition: isDragging ? 'none' : 'opacity 0.2s ease-out',
          willChange: 'opacity',
        }}
      />
      {/* Vertical line */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px bg-turquoise-400"
        style={{
          transform: 'translateX(-50%) translateZ(0)',
          opacity: isDragging ? 0.7 : 0.5,
          transition: isDragging ? 'none' : 'opacity 0.2s ease-out',
          willChange: 'opacity',
        }}
      />
      {/* Center dot */}
      <div
        className="absolute top-1/2 left-1/2 bg-turquoise-400 rounded-md"
        style={{
          transform: 'translate(-50%, -50%) translateZ(0)',
          width: isDragging ? '4px' : '2px',
          height: isDragging ? '4px' : '2px',
          transition: isDragging ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out',
          willChange: 'width, height',
        }}
      />
    </div>
  );
};

export default MagnifierCrosshair;

