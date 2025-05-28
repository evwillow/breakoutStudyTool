// src/app/providers.js
/**
 * Providers Component
 * 
 * Wraps the application with necessary providers for authentication.
 * This component sets up the Next-Auth SessionProvider to enable
 * authentication state management throughout the application.
 */
"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Providers component that wraps children with authentication context
 */
export default function Providers({ children }) {
  // Log initialization for debugging authentication issues
  // console.log("SessionProvider initialized"); // Removed debug log
  return <SessionProvider>{children}</SessionProvider>;
}