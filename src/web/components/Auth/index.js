/**
 * @fileoverview Barrel exports for authentication components and hooks.
 * @module src/web/components/Auth/index.js
 * @dependencies none
 */
// Auth Components Barrel Export
export { default as AuthModal } from './AuthModal';
export { default as AuthButtons } from './AuthButtons';
export { default as SignInButton } from './AuthButtons/SignInButton';
export { default as SignOutButton } from './AuthButtons/SignOutButton';
export { useAuth } from './hooks/useAuth';
export { useAuthModal } from './hooks/useAuthModal'; 