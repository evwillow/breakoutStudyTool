/**
 * @fileoverview Analytics page placeholder gated by authentication.
 * @module src/web/app/analytics/page.tsx
 * @dependencies React, @/lib/hooks/useAuthRedirect
 */
"use client";

import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";
import { LoadingSpinner } from "@/components/UI/LoadingSpinner";

/**
 * Analytics Page
 * 
 * Analytics dashboard for tracking performance and insights.
 * Features:
 * - Performance metrics
 * - Usage statistics
 * - Pattern analysis
 */
export default function AnalyticsPage() {
  const { session, isLoading, isAuthenticated } = useAuthRedirect();
  
  // Only show loading if truly loading and no session cookie exists
  // This allows instant navigation between pages
  if (isLoading) {
    return null;
  }
  
  // Only hide content if truly unauthenticated (redirect will happen)
  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[75%] max-w-[1400px] px-4 py-16">
        <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-turquoise-200 via-white to-turquoise-200 bg-clip-text text-transparent mb-6">
          Analytics
        </h1>
        <div className="bg-white/10 text-white px-8 py-10 rounded-md backdrop-blur-md border border-white/15 ring-1 ring-turquoise-300/30 shadow-[0_14px_40px_rgba(56,178,172,0.28)]">
          <p className="text-lg text-white/90 text-center">
            Analytics dashboard coming soon. Track your performance, view usage statistics, and analyze pattern recognition insights.
          </p>
        </div>
      </div>
    </div>
  );
}
