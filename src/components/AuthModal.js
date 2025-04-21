// /src/components/AuthModal.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const { update } = useSession();

  // Reset form when mode changes
  useEffect(() => {
    if (captchaRef.current) {
      captchaRef.current.resetCaptcha();
    }
    setCaptchaToken(null);
  }, [mode]);

  if (!open) return null;

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
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
      // Check if captcha is completed
      if (!captchaToken) {
        setError("Please complete the CAPTCHA verification");
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email, 
            password,
            captchaToken 
          }),
        });
        
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            
            // Check for captcha-related errors
            if (errorData.error === "Invalid CAPTCHA") {
              setError("CAPTCHA verification failed. Please try again.");
              if (captchaRef.current) {
                captchaRef.current.resetCaptcha();
              }
              setCaptchaToken(null);
            }
            // Check for database-related errors
            else if (errorData.error && (
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

    // Handle sign in
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result.error) {
        setError("Invalid username or password");
      } else {
        update();
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

          {mode === "signup" && (
            <>
              <div className="flex flex-col items-center">
                <p className="text-sm text-turquoise-600 mb-2">
                  By creating an account, you agree to our <Link href="/terms" className="underline hover:text-turquoise-800">Terms of Service</Link>
                </p>
              </div>
              
              {/* hCaptcha component */}
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
                  onVerify={handleCaptchaVerify}
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
              
              {databaseError && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-red-700">Possible solutions:</p>
                  <ul className="list-disc ml-5 text-xs text-red-700 mt-1">
                    <li>Check if the database connection is working</li>
                    <li>Verify if the database tables are set up correctly</li>
                    <li>Try again later or contact support</li>
                    <li><Link href="/database-status" className="underline">Check Database Status</Link></li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (mode === "signup" && !captchaToken)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-turquoise-600 hover:bg-turquoise-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-turquoise-500 disabled:bg-turquoise-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-sm text-turquoise-600 hover:text-turquoise-800"
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}