// src/components/AuthModal.js
"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("signin"); // "signin" or "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "signup") {
      alert("Account creation is not implemented yet.");
      return;
    }
    const result = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });
    if (result.error) {
      setError(
        result.error === "CredentialsSignin"
          ? "Invalid username or password"
          : result.error
      );
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white rounded-lg p-8 w-96 relative text-black shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 text-3xl"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-6 text-black">
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded mb-4 text-black focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded mb-4 text-black focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          />
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-gray-300 text-black rounded font-semibold hover:bg-gray-400 transition-colors"
          >
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={() =>
              setMode((prev) => (prev === "signin" ? "signup" : "signin"))
            }
            className="underline text-lg text-black"
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
