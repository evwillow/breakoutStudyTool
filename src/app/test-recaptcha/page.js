"use client";

import { useState, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";

export default function TestRecaptchaPage() {
  const [siteKey, setSiteKey] = useState("");
  const [token, setToken] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Get the site key from environment variables
    const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
    console.log("reCAPTCHA site key:", key);
    setSiteKey(key);
    
    // Check if the reCAPTCHA script is already loaded
    if (window.grecaptcha) {
      console.log("reCAPTCHA script already loaded");
      setScriptLoaded(true);
      return;
    }
    
    // Create a script element to load reCAPTCHA
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log("reCAPTCHA script loaded successfully");
      setScriptLoaded(true);
    };
    
    script.onerror = () => {
      console.error("Failed to load reCAPTCHA script");
      setError("Failed to load reCAPTCHA script");
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Clean up script if component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleVerify = async (token) => {
    console.log("reCAPTCHA verified, token received");
    setToken(token);
    setError(null);
    
    try {
      const response = await fetch("/api/test-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      console.log("Verification response:", data);
      setVerificationResult(data);
    } catch (err) {
      console.error("Error verifying token:", err);
      setError("Error verifying token: " + err.message);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">reCAPTCHA Test Page</h1>
      
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
        <div className="mb-4">
          <p className="font-medium">Site Key:</p>
          <p className="text-sm break-all bg-gray-100 p-2 rounded">{siteKey || "Not found"}</p>
        </div>
        
        <div className="mb-4">
          {!scriptLoaded ? (
            <div className="text-gray-600 p-4 bg-gray-50 rounded">
              Loading reCAPTCHA script...
            </div>
          ) : siteKey ? (
            <ReCAPTCHA
              sitekey={siteKey}
              onChange={handleVerify}
              onErrored={(error) => {
                console.error("reCAPTCHA error occurred:", error);
                setError("reCAPTCHA error. Please try again.");
              }}
              theme="light"
              size="normal"
              hl="en"
            />
          ) : (
            <div className="text-red-600 p-4 bg-red-50 rounded">
              reCAPTCHA site key not found. Please check your environment variables.
            </div>
          )}
        </div>
        
        {token && (
          <div className="mb-4">
            <p className="font-medium">Token:</p>
            <p className="text-xs break-all bg-gray-100 p-2 rounded">{token}</p>
          </div>
        )}
        
        {verificationResult && (
          <div className="mb-4">
            <p className="font-medium">Verification Result:</p>
            <pre className="bg-gray-100 p-2 rounded overflow-auto text-sm">
              {JSON.stringify(verificationResult, null, 2)}
            </pre>
          </div>
        )}
        
        {error && (
          <div className="text-red-600 p-4 bg-red-50 rounded">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 