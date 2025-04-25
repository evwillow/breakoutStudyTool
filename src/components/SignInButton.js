/**
 * SignInButton Component
 * 
 * A button component for triggering the authentication modal.
 * Features:
 * - Consistent styling with the application's design language
 * - Can be used in the header or elsewhere in the application
 * - Responsive design that adapts to different screen sizes
 * - Uses global openAuthModal function to trigger auth modal
 */
import React from "react";
import { useSession } from "next-auth/react";

/**
 * SignInButton displays a button to trigger authentication
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes to apply to the button
 * @returns {JSX.Element|null} Sign in button or null if user is already authenticated
 */
const SignInButton = ({ className = "" }) => {
  const { data: session } = useSession();
  
  // Don't render anything if the user is already signed in
  if (session) return null;
  
  const handleSignIn = () => {
    // Use the global openAuthModal function if available
    if (typeof window !== 'undefined' && window.openAuthModal) {
      window.openAuthModal();
    }
  };
  
  return (
    <button
      onClick={handleSignIn}
      className={`px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md shadow hover:bg-gray-700 transition inline-flex items-center justify-center whitespace-nowrap ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
      </svg>
      <span className="leading-none">Sign In</span>
    </button>
  );
};

export default SignInButton; 