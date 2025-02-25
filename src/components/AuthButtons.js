// src/components/AuthButtons.js
"use client";

import React from "react";
import { signOut, useSession } from "next-auth/react";

export default function AuthButtons({ onSignIn }) {
  const { data: session } = useSession();

  if (session) {
    return (
      <button
        onClick={() => signOut()}
        className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow"
      >
        Sign Out
      </button>
    );
  }
  return (
    <button
      onClick={onSignIn}
      className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow"
    >
      Sign In
    </button>
  );
}
