/**
 * Home Page Component
 * 
 * Renders the marketing LandingPage for unauthenticated users,
 * or redirects authenticated users to the dashboard.
 */
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LandingPage from "@/components/LandingPage/LandingPage";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      // User is logged in, redirect to study page
      router.push("/study");
    }
  }, [status, session, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-turquoise-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (status === "unauthenticated") {
    const handleSignIn = () => {
      // This will be handled by the auth modal in the LandingPage
      window.location.href = '/api/auth/signin';
    };

    return <LandingPage onSignIn={handleSignIn} />;
  }

  // If authenticated, this will redirect to dashboard
  return null;
}