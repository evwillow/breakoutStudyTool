/**
 * @fileoverview Typing effect component for feature names in the hero section.
 * @module src/web/components/LandingPage/components/TypedFeatures.tsx
 * @dependencies React
 */
"use client";

import React, { useState, useEffect } from "react";

const FEATURE_NAMES = [
  "Daily breakout drills",
  "Instant after-chart reveals",
  "Objective score tracking",
  "Timer-guided reps",
];

/**
 * TypedFeatures Component
 * 
 * Displays a typing animation that cycles through feature names.
 * Mobile-friendly with proper text wrapping and caret animation.
 */
export const TypedFeatures: React.FC = () => {
  const [text, setText] = useState("");
  const [featureIndex, setFeatureIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const current = FEATURE_NAMES[featureIndex % FEATURE_NAMES.length];
    const typeDelay = 32;
    const deleteDelay = 22;
    const endPause = 900;
    const startPause = 220;

    let timeoutId: NodeJS.Timeout | undefined;

    if (!isDeleting && charIndex === 0) {
      timeoutId = setTimeout(() => setCharIndex(1), startPause);
    } else if (!isDeleting && charIndex <= current.length) {
      timeoutId = setTimeout(() => {
        setText(current.slice(0, charIndex));
        setCharIndex(charIndex + 1);
      }, typeDelay);
    } else if (!isDeleting && charIndex > current.length) {
      timeoutId = setTimeout(() => {
        setIsDeleting(true);
        setCharIndex(current.length - 1);
      }, endPause);
    } else if (isDeleting && charIndex >= 0) {
      timeoutId = setTimeout(() => {
        setText(current.slice(0, charIndex));
        setCharIndex(charIndex - 1);
      }, deleteDelay);
    } else if (isDeleting && charIndex < 0) {
      setIsDeleting(false);
      setFeatureIndex((i) => (i + 1) % FEATURE_NAMES.length);
      setCharIndex(0);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [featureIndex, isDeleting, charIndex]);

  return (
    <div className="mt-4 w-full text-lg sm:text-xl lg:text-2xl text-turquoise-300 font-mono tracking-wide font-semibold whitespace-normal md:whitespace-nowrap break-words max-w-full leading-snug min-h-[2.6rem] sm:min-h-[2.4rem] mb-3">
      <span className="text-turquoise-400">Featuring</span>
      <span className="mx-2 text-turquoise-500">//</span>
      <span className="text-white">{text}</span>
      <span className="ml-1 border-r-2 border-turquoise-400 align-middle inline-block" style={{ animation: 'caretBlink 1s steps(1) infinite' }} />
      <style jsx>{`
        @keyframes caretBlink { 50% { border-color: transparent; } }
      `}</style>
    </div>
  );
};

export default TypedFeatures;

