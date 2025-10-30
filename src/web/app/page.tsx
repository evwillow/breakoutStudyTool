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

  // Immediately show landing page unless authenticated (no loading screen)
  if (status !== "authenticated") {
    const handleSignIn = () => {
      // This will be handled by the auth modal in the LandingPage
      window.location.href = '/api/auth/signin';
    };

    return <LandingPage onSignIn={handleSignIn} />;
  }

  // If authenticated, this will redirect to dashboard
  return null;
}