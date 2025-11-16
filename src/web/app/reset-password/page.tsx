"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FormInput from "@/components/Auth/AuthModal/FormInput";
import FormButton from "@/components/Auth/AuthModal/FormButton";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if token and email are in URL (from reset link)
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");

    if (urlToken && urlEmail) {
      setToken(urlToken);
      setEmail(urlEmail);
      setStep("reset");
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setMessage(data.message);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setMessage(data.message);
      setSuccess(true);

      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        router.push("/?signin=true");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-4 min-h-0 overflow-auto">
      <div className="relative w-full max-w-2xl my-auto">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-turquoise-900/25 via-transparent to-transparent blur-3xl"></div>
        <div className="relative overflow-hidden rounded-3xl border border-turquoise-200/60 bg-soft-white/95 shadow-2xl shadow-turquoise-950/20">
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <div className="space-y-2 text-center sm:text-left">
              <h1 className="text-xl font-semibold text-turquoise-800 sm:text-2xl">
                {step === "request" ? "Reset Password" : "Set New Password"}
              </h1>
              <p className="text-xs text-turquoise-500/90 sm:text-sm">
                {step === "request"
                  ? "Enter your email address and we'll send you a link to reset your password."
                  : "Enter your new password below."}
              </p>
            </div>

            {success && message && (
              <div className="rounded-2xl border border-green-200/40 bg-green-50/70 p-3 text-xs text-green-600">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200/40 bg-red-50/70 p-3 text-xs text-red-600">
                {error}
              </div>
            )}

            {step === "request" ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <FormInput
                  id="reset-email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />

                <FormButton
                  type="submit"
                  disabled={isLoading || !email}
                  isLoading={isLoading}
                  className="w-full"
                >
                  Send Reset Link
                </FormButton>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push("/?signin=true")}
                    className="text-sm text-turquoise-400 hover:text-turquoise-300 focus:outline-none focus:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <FormInput
                  id="reset-password"
                  label="New Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter new password"
                  required
                  autoComplete="new-password"
                />

                <FormInput
                  id="reset-confirm-password"
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                />

                <FormButton
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  isLoading={isLoading}
                  className="w-full"
                >
                  Reset Password
                </FormButton>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("request");
                      setToken("");
                      setEmail("");
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-sm text-turquoise-400 hover:text-turquoise-300 focus:outline-none focus:underline"
                  >
                    Request New Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-turquoise-600">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

