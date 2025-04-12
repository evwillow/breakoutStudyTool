"use client";

import React, { useState, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";

export default function RecaptchaTest() {
  const [siteKey, setSiteKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [token, setToken] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get the keys from environment variables
    setSiteKey(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "");
    setSecretKey(process.env.RECAPTCHA_SECRET_KEY || "");
  }, []);

  const handleVerify = async (token) => {
    setToken(token);
    setError(null);
    
    try {
      const response = await fetch("/api/test-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (err) {
      setError("Error verifying token: " + err.message);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">reCAPTCHA Test</h2>
      
      <div className="mb-4">
        <p className="font-medium">Site Key:</p>
        <p className="text-sm break-all bg-gray-100 p-2 rounded">{siteKey || "Not found"}</p>
      </div>
      
      <div className="mb-4">
        <p className="font-medium">Secret Key:</p>
        <p className="text-sm break-all bg-gray-100 p-2 rounded">{secretKey ? "****" + secretKey.slice(-4) : "Not found"}</p>
      </div>
      
      <div className="mb-4">
        <ReCAPTCHA
          sitekey={siteKey}
          onChange={handleVerify}
          onErrored={() => setError("reCAPTCHA error occurred")}
          theme="light"
          size="normal"
          hl="en"
        />
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
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(verificationResult, null, 2)}
          </pre>
        </div>
      )}
      
      {error && (
        <div className="text-red-600">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
} 