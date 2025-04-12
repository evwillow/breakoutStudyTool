// /src/components/AuthModal.js
"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import ReCAPTCHA from "react-google-recaptcha";

// Custom hook to ensure reCAPTCHA script is loaded
const useRecaptchaScript = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if the script is already loaded
    if (window.grecaptcha) {
      console.log("reCAPTCHA script already loaded");
      setIsLoaded(true);
      return;
    }

    // Create a script element
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    
    // Handle script load
    script.onload = () => {
      console.log("reCAPTCHA script loaded successfully");
      setIsLoaded(true);
    };
    
    // Handle script error
    script.onerror = () => {
      console.error("Error loading reCAPTCHA script");
      setError("Failed to load reCAPTCHA");
    };
    
    // Append script to document
    document.head.appendChild(script);
    
    // Cleanup
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return { isLoaded, error };
};

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState(null);
  const { update } = useSession();
  const { isLoaded: isRecaptchaLoaded, error: recaptchaScriptError } = useRecaptchaScript();
  const [siteKey, setSiteKey] = useState("");

  useEffect(() => {
    // Reset captcha when mode changes
    setCaptchaToken(null);
    setCaptchaError(null);
    
    // Get the site key from environment variables
    const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
    console.log("reCAPTCHA site key:", key);
    setSiteKey(key);
  }, [mode]);

  if (!open) return null;

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (mode === "signup") {
      if (!captchaToken) {
        setError("Please complete the CAPTCHA verification");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, captchaToken }),
        });
        
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
            <div className="flex flex-col items-center">
              {recaptchaScriptError ? (
                <div className="text-red-600 text-sm">
                  {recaptchaScriptError}
                </div>
              ) : !isRecaptchaLoaded ? (
                <div className="text-gray-600 text-sm">
                  Loading reCAPTCHA...
                </div>
              ) : siteKey ? (
                <ReCAPTCHA
                  sitekey={siteKey}
                  onChange={(token) => {
                    console.log("reCAPTCHA token received");
                    setCaptchaToken(token);
                    setCaptchaError(null);
                  }}
                  onErrored={(error) => {
                    console.error("reCAPTCHA error occurred:", error);
                    setCaptchaError("reCAPTCHA error. Please try again.");
                    setCaptchaToken(null);
                  }}
                  onExpired={() => {
                    console.log("reCAPTCHA token expired");
                    setCaptchaToken(null);
                  }}
                  theme="light"
                  size="normal"
                  hl="en"
                />
              ) : (
                <div className="text-red-600 text-sm">
                  reCAPTCHA configuration error. Please contact support.
                </div>
              )}
              {captchaError && (
                <div className="text-red-600 text-sm mt-2">
                  {captchaError}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg font-medium text-white bg-gradient-turquoise hover-gradient-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === "signin" ? "Signing In..." : "Signing Up..."}
              </div>
            ) : (
              <>{mode === "signin" ? "Sign In" : "Sign Up"}</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode((prev) => (prev === "signin" ? "signup" : "signin"));
              setError(null);
            }}
            className="text-turquoise-600 hover:text-turquoise-800 text-sm font-medium transition-colors"
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