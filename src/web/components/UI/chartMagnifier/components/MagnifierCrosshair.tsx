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
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-1/2 left-0 right-0 h-px bg-turquoise-400"
        style={{
          transform: 'translateY(-50%)',
          opacity: isDragging ? 0.7 : 0.5,
        }}
      />
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px bg-turquoise-400"
        style={{
          transform: 'translateX(-50%)',
          opacity: isDragging ? 0.7 : 0.5,
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 bg-turquoise-400 rounded-md transition-all"
        style={{
          transform: 'translate(-50%, -50%)',
          width: isDragging ? '4px' : '2px',
          height: isDragging ? '4px' : '2px',
        }}
      />
    </div>
  );
};

export default MagnifierCrosshair;

