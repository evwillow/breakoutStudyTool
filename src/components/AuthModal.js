// /src/components/AuthModal.js
"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState(false);
  const { update } = useSession();

  if (!open) return null;

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setDatabaseError(false);
    setIsLoading(true);

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (mode === "signup") {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            
            // Check for database-related errors
            if (errorData.error && (
                errorData.error.includes("Database") || 
                errorData.error.includes("database") ||
                errorData.isPaused ||
                errorData.tableIssue
              )) {
              setDatabaseError(true);
              setError(errorData.error + (errorData.details ? `: ${errorData.details}` : ''));
            } else {
              setError(errorData.error || "Failed to create account");
            }
          } else {
            const errorText = await res.text();
            console.error("Signup error response:", errorText);
            setError("Failed to create account. Server returned an invalid response.");
          }
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        
        // Automatically sign in using NextAuth session
        const signInRes = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (signInRes.error) {
          setError("Error signing in after signup.");
        } else {
          alert("Account created successfully! You are now logged in.");
          update();
          onClose();
        }
      } catch (err) {
        console.error("Signup error:", err);
        setError("Signup failed: " + (err.message || "Unknown error"));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Normal Sign-in Flow
    try {
      const result = await signIn("credentials", { 
        redirect: false, 
        email, 
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-turquoise-950 bg-opacity-70 z-50 p-4 backdrop-blur-sm">
      <div className="bg-soft-white rounded-xl p-6 sm:p-8 w-full max-w-xs sm:max-w-sm md:max-w-md relative text-turquoise-800 shadow-2xl border border-turquoise-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-turquoise-500 hover:text-turquoise-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-turquoise-100 rounded-full mb-2">
            <svg className="w-8 h-8 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-turquoise-800">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-turquoise-600 mt-1">
            {mode === "signin" ? "Sign in to continue to the app" : "Sign up to get started"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-turquoise-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-turquoise-300 shadow-sm focus:border-turquoise-500 focus:ring-turquoise-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-turquoise-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-turquoise-300 shadow-sm focus:border-turquoise-500 focus:ring-turquoise-500"
              required
            />
          </div>

          {error && (
            <div className="p-2 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
              {databaseError && (
                <div className="mt-2">
                  <Link 
                    href="/database-status" 
                    className="text-blue-600 underline font-medium"
                    onClick={onClose}
                  >
                    Check Database Status
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-turquoise-600 hover:bg-turquoise-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-turquoise-500 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-turquoise-600">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="ml-1 font-semibold text-turquoise-600 hover:text-turquoise-800 transition-colors focus:outline-none focus:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}