/**
 * @fileoverview Delete account confirmation modal component.
 * @module src/web/components/Header/components/DeleteAccountModal.tsx
 * @dependencies React, react-dom
 */
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FormInput from "../../Auth/AuthModal/FormInput";
import FormButton from "../../Auth/AuthModal/FormButton";

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (email: string, password: string) => Promise<void>;
  userEmail?: string;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setError(null);
      setEmailError(null);
      setIsDeleting(false);
    }
  }, [isOpen]);

  // Control body scroll when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    // Validate email matches
    if (email !== userEmail) {
      setEmailError("Email does not match your account email");
      return;
    }

    // Validate password is provided
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm(email, password);
      // Reset form on success
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing while deleting
    setEmail("");
    setPassword("");
    setError(null);
    setEmailError(null);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-turquoise-950/70 backdrop-blur-sm" onClick={handleClose}></div>
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-turquoise-900/25 via-transparent to-transparent blur-3xl"></div>
          <div className="relative overflow-hidden rounded-3xl border border-turquoise-200/60 bg-soft-white/95 shadow-2xl shadow-turquoise-950/20">
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-turquoise-500 transition hover:text-turquoise-400 focus:outline-none focus:ring-2 focus:ring-turquoise-400 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="space-y-3 text-center sm:text-left">
                <h2 className="text-2xl font-semibold text-turquoise-800 sm:text-3xl">
                  Delete Account
                </h2>
                <p className="text-sm text-turquoise-500/90 sm:text-base">
                  This action cannot be undone. This will permanently delete your account and all associated data.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <FormInput
                  id="confirm-email"
                  label="Type your email to confirm"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder={userEmail || "your@email.com"}
                  required
                  autoComplete="email"
                  error={emailError || undefined}
                  className=""
                />

                <div className="space-y-2">
                  <FormInput
                    id="confirm-password"
                    label="Enter your password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Your password"
                    required
                    autoComplete="current-password"
                    error={error && !emailError ? error : undefined}
                    className=""
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        window.location.href = '/reset-password';
                      }}
                      disabled={isDeleting}
                      className="text-sm text-turquoise-400 hover:text-turquoise-300 focus:outline-none focus:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {error && !emailError && (
                  <div className="rounded-2xl border border-red-200/40 bg-red-50/70 p-4 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <FormButton
                    type="button"
                    onClick={handleClose}
                    disabled={isDeleting}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </FormButton>
                  <FormButton
                    type="submit"
                    disabled={isDeleting || !email || !password}
                    isLoading={isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-500 focus:ring-red-500 disabled:bg-red-800 disabled:text-red-400"
                  >
                    Delete Account
                  </FormButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
};

export default DeleteAccountModal;

