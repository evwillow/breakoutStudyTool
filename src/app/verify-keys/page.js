"use client";

import { useState, useEffect } from "react";

export default function VerifyKeysPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const verifyKeys = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/verify-recaptcha-keys");
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError("Error verifying keys: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Verify reCAPTCHA Keys</h1>
      
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
        <button
          onClick={verifyKeys}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify Keys"}
        </button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {result && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2">Results:</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 