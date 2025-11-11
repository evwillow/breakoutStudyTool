"use client";

import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";
import FlashcardsContainer from "@/components/Flashcards/FlashcardsContainer";
import { LoadingStates } from "@/components/Flashcards/components/LoadingStates";

/**
 * Study Page
 * 
 * Main study interface where users practice breakout pattern recognition.
 * Features:
 * - Interactive flashcard system
 * - Real market data visualization
 * - Performance tracking
 * - Timer-based practice sessions
 */
export default function Study() {
  const { session, isLoading } = useAuthRedirect();
  
  // Show loading screen during auth - use DataLoading component for exact same structure
  if (isLoading || !session) {
    return (
      <>
        <div className="fixed inset-0 bg-black z-40 pointer-events-none" style={{ pointerEvents: 'none' }} />
        <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden pointer-events-none" style={{ pointerEvents: 'none' }}>
          <LoadingStates.DataLoading />
        </div>
      </>
    );
  }

  // Render FlashcardsContainer - it will show its own loading screen when needed
  // Both use fixed positioning so they'll overlap seamlessly
  return (
    <>
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[1800px] px-2 sm:px-4">
          <FlashcardsContainer />
        </div>
      </div>
    </>
  );
}

