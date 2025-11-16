/**
 * @fileoverview Hook for managing timer display, duration selection, and popup positioning.
 * @module src/web/components/ChartSection/hooks/useChartTimer.ts
 * @dependencies React
 */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { PopupPosition } from "../ChartSection.types";

export interface UseChartTimerOptions {
  timer: number | null | undefined;
  timerDuration: number | null;
  onTimerDurationChange?: ((duration: number) => void) | null;
  isMobile: boolean;
}

export interface UseChartTimerReturn {
  showTimerPopup: boolean;
  setShowTimerPopup: (show: boolean) => void;
  showCustomInput: boolean;
  setShowCustomInput: (show: boolean) => void;
  customValue: string;
  setCustomValue: (value: string) => void;
  popupPosition: PopupPosition;
  timerContainerRef: React.RefObject<HTMLDivElement | null>;
  timerPopupRef: React.RefObject<HTMLDivElement | null>;
  timerTriggerRef: React.RefObject<HTMLButtonElement | null>;
  customInputRef: React.RefObject<HTMLInputElement | null>;
  durations: Array<{ value: number; label: string }>;
  getTimerColor: () => string;
  handlePresetClick: (value: number) => void;
  handleCustomClick: () => void;
  handleCustomInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCustomSubmit: () => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useChartTimer({
  timer,
  timerDuration,
  onTimerDurationChange,
  isMobile,
}: UseChartTimerOptions): UseChartTimerReturn {
  const [showTimerPopup, setShowTimerPopup] = useState<boolean>(false);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customValue, setCustomValue] = useState<string>("");
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({ 
    top: '0px', 
    left: '0px', 
    right: 'auto', 
    bottom: 'auto' 
  });
  
  const timerContainerRef = useRef<HTMLDivElement>(null);
  const timerPopupRef = useRef<HTMLDivElement>(null);
  const timerTriggerRef = useRef<HTMLButtonElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const durations = useMemo(() => [
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 180, label: "3 minutes" },
  ], []);

  const getTimerColor = (): string => {
    if (timer === null || timer === undefined || typeof timer !== 'number') return "text-turquoise-600";
    if (timer <= 10) return "text-red-600";
    if (timer <= 30) return "text-yellow-600";
    return "text-turquoise-600";
  };

  const handlePresetClick = (value: number): void => {
    if (onTimerDurationChange) {
      onTimerDurationChange(Number(value));
    }
    setShowTimerPopup(false);
    setShowCustomInput(false);
  };

  const handleCustomClick = (): void => {
    setShowCustomInput(true);
    setCustomValue("");
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setCustomValue(e.target.value);
  };

  const handleCustomSubmit = (): void => {
    let numValue = 60;
    if (customValue && !isNaN(Number(customValue))) {
      numValue = Math.max(1, Math.round(Number(customValue)));
    }
    if (onTimerDurationChange) {
      onTimerDurationChange(numValue);
    }
    setShowTimerPopup(false);
    setShowCustomInput(false);
    setCustomValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomValue("");
    }
  };

  // Focus input when custom input is shown
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  // Calculate popup position for absolute positioning relative to timer container
  useEffect(() => {
    if (!showTimerPopup || !timerContainerRef.current) {
      return;
    }

    const calculatePosition = (): void => {
      if (!timerContainerRef.current || !timerPopupRef.current) return;
      
      const timerContainer = timerContainerRef.current;
      const popup = timerPopupRef.current;
      const timerRect = timerContainer.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const chartContainer = timerContainer.closest('[class*="chartContainer"]') || timerContainer.parentElement?.parentElement?.parentElement;
      if (!chartContainer) return;
      
      const chartRect = chartContainer.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const popupWidth = popupRect.width || 200;
      const popupHeight = popupRect.height || 250;
      const gap = 8;
      
      const spaceOnRight = viewportWidth - timerRect.right;
      const spaceOnLeft = timerRect.left;
      const timerHeight = timerRect.height;
      const timerWidth = timerRect.width;
      
      const timerTopRelative = timerRect.top - chartRect.top;
      const timerLeftRelative = timerRect.left - chartRect.left;
      
      let top = timerTopRelative + timerHeight + gap;
      let left = timerLeftRelative + timerWidth - popupWidth;
      
      let popupLeftEdge = timerRect.left + left;
      let popupRightEdge = popupLeftEdge + popupWidth;
      
      if (isMobile) {
        left = timerLeftRelative;
        popupLeftEdge = chartRect.left + left;
        popupRightEdge = popupLeftEdge + popupWidth;
        
        if (popupRightEdge > viewportWidth - 8) {
          left = viewportWidth - chartRect.left - popupWidth - 8;
          if (left < 0) {
            left = timerLeftRelative;
          }
          popupLeftEdge = chartRect.left + left;
          popupRightEdge = popupLeftEdge + popupWidth;
        }
        
        if (popupLeftEdge < 8) {
          left = 8 - chartRect.left;
          if (left < 0) left = timerLeftRelative;
        }
      } else {
        left = timerLeftRelative + timerWidth - popupWidth;
        popupLeftEdge = chartRect.left + left;
        popupRightEdge = popupLeftEdge + popupWidth;
        
        if (popupLeftEdge < 8) {
          left = 0;
          popupLeftEdge = timerRect.left;
          popupRightEdge = popupLeftEdge + popupWidth;
          
          if (popupRightEdge > viewportWidth - 8) {
            left = viewportWidth - timerRect.left - popupWidth - 8;
            if (left < 0) left = 0;
            popupLeftEdge = timerRect.left + left;
            popupRightEdge = popupLeftEdge + popupWidth;
          }
        }
        
        if (popupRightEdge > viewportWidth - 8) {
          if (spaceOnLeft >= popupWidth) {
            left = -popupWidth;
            popupLeftEdge = timerRect.left + left;
            if (popupLeftEdge < 8) {
              left = -timerRect.left + 8;
              if (left < 0) left = 0;
            }
            popupLeftEdge = timerRect.left + left;
            popupRightEdge = popupLeftEdge + popupWidth;
          } else {
            left = viewportWidth - timerRect.left - popupWidth - 8;
            if (left < 0) left = 0;
            popupLeftEdge = timerRect.left + left;
            popupRightEdge = popupLeftEdge + popupWidth;
          }
        }
        
        if (popupLeftEdge < 8) {
          left = 8 - timerRect.left;
          if (left < 0) left = 0;
          popupLeftEdge = timerRect.left + left;
          popupRightEdge = popupLeftEdge + popupWidth;
        }
      }
      
      const popupTopEdge = timerRect.top + top;
      const popupBottomEdge = timerRect.bottom + top + popupHeight;
      
      if (popupLeftEdge < 8) {
        left = 8 - timerRect.left;
        popupLeftEdge = timerRect.left + left;
        popupRightEdge = popupLeftEdge + popupWidth;
      }
      
      if (popupRightEdge > viewportWidth - 8) {
        left = viewportWidth - timerRect.left - popupWidth - 8;
        popupLeftEdge = timerRect.left + left;
        popupRightEdge = popupLeftEdge + popupWidth;
        
        if (popupLeftEdge < 8) {
          left = 8 - timerRect.left;
        }
      }
      
      if (popupTopEdge < 8) {
        top = 8 - timerRect.top;
        if (top < timerHeight + gap) {
          top = timerHeight + gap;
        }
      }
      
      if (popupBottomEdge > viewportHeight - 8) {
        const overflow = popupBottomEdge - (viewportHeight - 8);
        top = Math.max(timerHeight + gap, top - overflow);
        const newBottomEdge = timerRect.bottom + top + popupHeight;
        if (newBottomEdge > viewportHeight - 8) {
          top = Math.max(timerHeight + gap, viewportHeight - 8 - (timerRect.bottom - timerRect.top) - popupHeight);
        }
      }
      
      if (left < 0 && timerRect.left + left < 8) {
        left = Math.max(0, 8 - timerRect.left);
      }
      
      if (top < 0) {
        top = timerHeight + gap;
      }
      
      setPopupPosition({ top: `${top}px`, left: `${left}px`, right: 'auto', bottom: 'auto' });
    };

    const timeoutId = setTimeout(() => {
      calculatePosition();
      setTimeout(calculatePosition, 10);
      setTimeout(calculatePosition, 50);
    }, 0);

    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [showTimerPopup, isMobile]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!showTimerPopup) return;

    function handleClickOutside(event: MouseEvent): void {
      if (timerPopupRef.current && event.target instanceof Node && !timerPopupRef.current.contains(event.target)) {
        const timerTrigger = (event.target as Element).closest('[data-timer-trigger]');
        if (!timerTrigger) {
          setShowTimerPopup(false);
          setShowCustomInput(false);
          setCustomValue("");
        }
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTimerPopup]);

  return {
    showTimerPopup,
    setShowTimerPopup,
    showCustomInput,
    setShowCustomInput,
    customValue,
    setCustomValue,
    popupPosition,
    timerContainerRef,
    timerPopupRef,
    timerTriggerRef,
    customInputRef,
    durations,
    getTimerColor,
    handlePresetClick,
    handleCustomClick,
    handleCustomInputChange,
    handleCustomSubmit,
    handleKeyPress,
  };
}

