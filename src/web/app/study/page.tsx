"use client";

import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import FlashcardsContainer from "@/components/Flashcards/FlashcardsContainer";

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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-turquoise-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading study session...</p>
        </div>
      </div>
    );
  }
  
  if (!session) return null;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[1800px] px-2 sm:px-4">
        <FlashcardsContainer />
      </div>
    </div>
  );
}

