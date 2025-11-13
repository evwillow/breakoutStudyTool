/**
 * @fileoverview Authentication buttons component for header.
 * @module src/web/components/Header/components/AuthButtons.tsx
 * @dependencies React
 */
"use client";

import React from "react";

export interface AuthButtonsProps {
  scrolled: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  isMobile?: boolean;
}

export const AuthButtons: React.FC<AuthButtonsProps> = ({
  scrolled,
  onSignIn,
  onSignUp,
  isMobile = false,
}) => {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={onSignIn}
          className="w-full px-5 py-3 bg-turquoise-600 text-white font-semibold rounded-md hover:bg-turquoise-500 transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={onSignUp}
          className="w-full px-5 py-3 bg-white/10 text-white font-semibold rounded-md hover:bg-white/20 transition-colors"
        >
          Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="hidden min-[800px]:flex items-center gap-3">
      <button
        onClick={onSignIn}
        className={`px-5 py-2.5 font-semibold rounded-md transition-colors ${
          scrolled
            ? "bg-turquoise-600 text-white hover:bg-turquoise-500"
            : "bg-turquoise-600 text-white hover:bg-turquoise-500"
        }`}
      >
        Sign In
      </button>
      <button
        onClick={onSignUp}
        className={`px-5 py-2.5 font-semibold rounded-md transition-colors ${
          scrolled
            ? "bg-white text-turquoise-600 border border-turquoise-100 hover:bg-gray-50"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        Sign Up
      </button>
    </div>
  );
};

export default AuthButtons;

