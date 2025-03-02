// /src/components/AuthModal.js
"use client";

import React, { useState } from "react";
import { signIn, useSession } from "next-auth/react";

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { update } = useSession(); // Hook to update session

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        
        // Check if response is OK before trying to parse JSON
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            setError(errorData.error || "Failed to create account");
          } else {
            const errorText = await res.text();
            console.error("Signup error response:", errorText);
            setError("Failed to create account. Server returned an invalid response.");
          }
          return;
        }

        const data = await res.json();
        
        // Automatically sign in using NextAuth session
        const signInRes = await signIn("credentials", {
          redirect: false,
          username,
          password,
        });

        if (signInRes.error) {
          setError("Error signing in after signup.");
        } else {
          alert("Account created successfully! You are now logged in.");
          update(); // Refresh the session
          onClose();
        }
      } catch (err) {
        console.error("Signup error:", err);
        setError("Signup failed: " + (err.message || "Unknown error"));
      }
      return;
    }

    // Normal Sign-in Flow
    try {
      const result = await signIn("credentials", { 
        redirect: false, 
        username, 
        password 
      });
      
      if (result.error) {
        setError("Invalid username or password");
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Sign in failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-8 w-full max-w-xs sm:max-w-sm md:max-w-md relative text-black shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 text-2xl sm:text-3xl"
        >
          &times;
        </button>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-black">
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 sm:p-3 border border-gray-300 rounded mb-3 sm:mb-4 text-black text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 sm:p-3 border border-gray-300 rounded mb-3 sm:mb-4 text-black text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          />
          {error && <p className="text-red-500 mb-3 sm:mb-4 text-sm sm:text-base">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 sm:py-3 bg-gray-300 text-black rounded font-semibold text-sm sm:text-base hover:bg-gray-400 transition-colors"
          >
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>
        <div className="mt-4 sm:mt-6 text-center">
          <button
            onClick={() =>
              setMode((prev) => (prev === "signin" ? "signup" : "signin"))
            }
            className="underline text-base sm:text-lg text-black"
          >
            {mode === "signin"
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}