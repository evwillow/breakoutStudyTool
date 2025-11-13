/**
 * @fileoverview React context and hooks for controlling the authentication modal state.
 * @module src/web/components/Auth/hooks/useAuthModal.ts
 * @dependencies React
 */
"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

interface AuthModalContextValue {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

interface AuthModalProviderProps {
  children: ReactNode;
}

/**
 * Provider component for auth modal context
 */
export const AuthModalProvider: React.FC<AuthModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const value: AuthModalContextValue = {
    isOpen,
    openModal,
    closeModal
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
};

/**
 * Hook to access auth modal state and controls
 */
export const useAuthModal = (): AuthModalContextValue => {
  const context = useContext(AuthModalContext);
  
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  
  return context;
};

/**
 * Simple hook for components that just need modal state
 */
export const useAuthModalState = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    openModal,
    closeModal
  };
};

