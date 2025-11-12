"use client";

import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";
import FlashcardsContainer from "@/components/Flashcards/FlashcardsContainer";
import { LoadingStates } from "@/components/Flashcards/components/LoadingStates";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import React from "react";

/**
 * Study Page Content Component
 * Separated to allow Suspense boundary for useSearchParams
 */
function StudyContent() {
  const { session, isLoading } = useAuthRedirect();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tutorialTrigger, setTutorialTrigger] = React.useState(false);
  const [tutorialKey, setTutorialKey] = React.useState(0);
  const tutorialParamRef = React.useRef<string | null>(null);
  
  // Listen for replay tutorial event (when already on study page)
  React.useEffect(() => {
    const handleReplayTutorial = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Replay tutorial event received');
      // Force a complete reset by incrementing key and resetting trigger
      setTutorialTrigger(false);
      setTutorialKey(prev => prev + 1); // Force remount
      // Set trigger to true after a delay to ensure component has remounted and started loading
      // Give it more time to ensure the component is ready
      setTimeout(() => {
        console.log('Setting tutorial trigger to true after reset (from event)');
        setTutorialTrigger(true);
      }, 300);
    };

    window.addEventListener('replay-tutorial', handleReplayTutorial, true);
    return () => {
      window.removeEventListener('replay-tutorial', handleReplayTutorial, true);
    };
  }, []);
  
  // Check for tutorial parameter and remove it immediately
  React.useEffect(() => {
    const tutorialParam = searchParams.get('tutorial');
    const prevParam = tutorialParamRef.current;
    tutorialParamRef.current = tutorialParam;
    
    if (tutorialParam === 'true') {
      console.log('Tutorial parameter detected, removing from URL and triggering tutorial');
      // Force a complete reset by incrementing key and resetting trigger
      setTutorialTrigger(false);
      setTutorialKey(prev => prev + 1); // Force remount
      // Remove query parameter immediately (async to not block state update)
      setTimeout(() => {
        router.replace('/study', { scroll: false });
        // Set trigger to true after a delay to ensure component has remounted and started loading
        // Give it more time to ensure the component is ready
        setTimeout(() => {
          console.log('Setting tutorial trigger to true after reset');
          setTutorialTrigger(true);
        }, 300);
      }, 50);
    } else if (prevParam === 'true' && tutorialParam !== 'true') {
      // Parameter was just removed, ensure trigger is reset
      console.log('Tutorial parameter removed, resetting trigger');
      setTutorialTrigger(false);
    }
  }, [searchParams, router]);
  
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
          <FlashcardsContainer key={tutorialKey} tutorialTrigger={tutorialTrigger} />
        </div>
      </div>
    </>
  );
}

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
  return (
    <Suspense fallback={
      <>
        <div className="fixed inset-0 bg-black z-40 pointer-events-none" style={{ pointerEvents: 'none' }} />
        <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden pointer-events-none" style={{ pointerEvents: 'none' }}>
          <LoadingStates.DataLoading />
        </div>
      </>
    }>
      <StudyContent />
    </Suspense>
  );
}
