/**
 * @fileoverview Community landing page placeholder gated by authentication.
 * @module src/web/app/community/page.tsx
 * @dependencies React, @/lib/hooks/useAuthRedirect
 */
"use client";

import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";
import { LoadingSpinner } from "@/components/UI/LoadingSpinner";

/**
 * Community Page
 * 
 * Community features for sharing and discussing breakout patterns.
 * Features:
 * - Discussion forums
 * - Pattern sharing
 * - Community insights
 */
export default function CommunityPage() {
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
          Community
        </h1>
        <div className="bg-white/10 text-white px-8 py-10 rounded-md backdrop-blur-md border border-white/15 ring-1 ring-turquoise-300/30 shadow-[0_14px_40px_rgba(56,178,172,0.28)]">
          <p className="text-lg text-white/90 text-center">
            Community features coming soon. Connect with other traders, share patterns, and learn from the community.
          </p>
        </div>
      </div>
    </div>
  );
}
