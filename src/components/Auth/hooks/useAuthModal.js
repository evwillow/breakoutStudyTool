/**
 * Auth Modal State Management Hook
 * Replaces global window.openAuthModal with proper React state management
 */

import { useState, useCallback, createContext, useContext } from 'react';

// Create context for auth modal state
const AuthModalContext = createContext();

/**
 * Provider component for auth modal context
 */
export const AuthModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const value = {
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
 * @returns {Object} Modal state and control functions
 */
export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  
  return context;
};

/**
 * Simple hook for components that just need modal state
 * @returns {Object} Modal state and controls
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