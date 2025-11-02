"use client";

import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";
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
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-r-2 border-b-2 border-turquoise-400 border-t-transparent mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-turquoise-400 rounded-full"></div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white bg-gradient-to-r from-turquoise-400 to-turquoise-300 bg-clip-text text-transparent">
              Loading Study Session
            </h2>
            <p className="mt-2 text-turquoise-300 text-sm">Preparing your trading practice...</p>
          </div>
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

