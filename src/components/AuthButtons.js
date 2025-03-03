/**
 * AuthButtons Component
 * 
 * Displays authentication buttons based on the user's session state.
 * Features:
 * - Conditional rendering based on authentication status
 * - Sign In button for unauthenticated users
 * - Sign Out button for authenticated users
 * - Responsive design that adapts to different screen sizes
 * - Integration with NextAuth.js for session management
 */
"use client"

import React from "react"
import { signOut, useSession } from "next-auth/react"

/**
 * AuthButtons component that handles user authentication UI
 * @param {Object} props - Component props
 * @param {Function} props.onSignIn - Optional callback function triggered after successful sign-in
 * @returns {JSX.Element} Authentication buttons based on session state
 */
export default function AuthButtons({ onSignIn }) {
  // Get current session state from NextAuth
  const { data: session } = useSession()

  if (session) {
    // Render Sign Out button for authenticated users
    return (
      <button
        onClick={() => signOut()}
        className="px-2 sm:px-3 py-3 sm:py-1 bg-gray-300 text-black text-base sm:text-sm border border-black rounded shadow hover:bg-gray-400 transition"
      >
        Sign Out
      </button>
    )
  }
  
  // Render Sign In button for unauthenticated users
  return (
    <button
      onClick={onSignIn}
      className="px-2 sm:px-3 py-3 sm:py-1 bg-gray-300 text-black text-base sm:text-sm border border-black rounded shadow hover:bg-gray-400 transition"
    >
      Sign In
    </button>
  )
}
