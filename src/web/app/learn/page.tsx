"use client";

import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";

/**
 * Learn Page
 * 
 * Educational content and resources for learning breakout patterns.
 * Features:
 * - Tutorials and guides
 * - Pattern recognition tips
 * - Trading strategies
 */
export default function LearnPage() {
  const { session, isLoading } = useAuthRedirect();
  
  if (isLoading) {
    return (
      <>
        <div className="fixed inset-0 bg-black z-40" />
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-6">
            <div className="animate-spin rounded-md h-20 w-20 border-t-2 border-r-2 border-b-2 border-turquoise-400 border-t-transparent"></div>
            <p className="text-white text-lg">Loading...</p>
          </div>
        </div>
      </>
    );
  }
  
  if (!session) return null;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[75%] max-w-[1400px] px-4 py-16">
        <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-turquoise-200 via-white to-turquoise-200 bg-clip-text text-transparent mb-6">
          Learn
        </h1>
        <div className="bg-white/10 text-white px-8 py-10 rounded-md backdrop-blur-md border border-white/15 ring-1 ring-turquoise-300/30 shadow-[0_14px_40px_rgba(56,178,172,0.28)]">
          <p className="text-lg text-white/90 text-center">
            Educational resources and tutorials coming soon. Learn about breakout patterns, trading strategies, and pattern recognition techniques.
          </p>
        </div>
      </div>
    </div>
  );
}
