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
        {/* Black background overlay covering entire page including header/footer */}
        <div className="fixed inset-0 bg-black z-40 pointer-events-none" style={{ pointerEvents: 'none' }} />
        <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden pointer-events-none" style={{ pointerEvents: 'none' }}>
          {/* Match exact DataLoading structure - wrapper div then box, exactly as DataLoading renders */}
          <div className="w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black overflow-hidden">
            <div className="flex flex-col justify-center items-center space-y-6 p-8 bg-black rounded-xl shadow-2xl w-[28rem] border border-white mx-auto box-border">
              <div className="relative">
                <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-r-2 border-b-2 border-turquoise-400 border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-turquoise-400 rounded-full"></div>
                </div>
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-turquoise-400 to-turquoise-300 bg-clip-text text-transparent">
                  Loading Study Session
                </h2>
                {/* Empty paragraph to match step message height in DataLoading */}
                <p className="text-turquoise-300 text-lg font-medium opacity-0 pointer-events-none" aria-hidden="true">
                  &nbsp;
                </p>
                {/* Empty folder section to maintain same structure - must match DataLoading min-h */}
                <div className="flex items-center justify-center gap-2 pt-2 min-h-[2.5rem] opacity-0 pointer-events-none" aria-hidden="true">
                  <span className="text-gray-400 text-sm">&nbsp;</span>
                  <span className="text-turquoise-400 text-sm font-semibold bg-gray-900 px-3 py-1 rounded-md border border-turquoise-500/30">
                    &nbsp;
                  </span>
                </div>
              </div>
              {/* Progress bar container to maintain same box height - always empty for this screen */}
              <div className="w-full bg-gray-900 rounded-full h-3 border border-gray-700">
                <div className="bg-transparent h-3 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
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

