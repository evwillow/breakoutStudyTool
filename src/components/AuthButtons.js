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
        onClick={() => signOut({ redirect: false })}
        className="px-3 py-1.5 bg-gradient-to-r from-turquoise-700 to-turquoise-600 text-white text-sm rounded-md shadow hover:from-turquoise-800 hover:to-turquoise-700 transition flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zM2 4a2 2 0 012-2h5.586a1 1 0 01.707.293l6 6a1 1 0 01.293.707V16a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" clipRule="evenodd" />
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
        Sign Out
      </button>
    )
  }
  
  // Render Sign In button for unauthenticated users
  return (
    <button
      onClick={onSignIn}
      className="px-3 py-1.5 bg-gradient-turquoise text-white text-sm rounded-md shadow hover-gradient-turquoise transition flex items-center"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
      </svg>
      Sign In
    </button>
  )
}
