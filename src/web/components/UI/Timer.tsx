"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface TimerProps {
  duration?: number;
  onTimeUp: () => void;
  className?: string;
}

/**
 * Optimized Timer component with TypeScript and performance improvements
 */
const Timer: React.FC<TimerProps> = ({ 
  duration = 60, 
  onTimeUp, 
  className = "text-2xl font-bold" 
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  // Memoize the onTimeUp callback to prevent unnecessary re-renders
  const handleTimeUp = useCallback(() => {
    onTimeUp();
  }, [onTimeUp]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, handleTimeUp]);

  // Reset timer when duration changes
  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  // Format time display (e.g., 1:30 instead of 90s for longer durations)
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={className}>
      Time Left: {formatTime(timeLeft)}
    </div>
  );
};

export default Timer; 