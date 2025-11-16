/**
 * @fileoverview Mobile menu component with backdrop and navigation panel.
 * @module src/web/components/Header/components/MobileMenu.tsx
 * @dependencies React, next/link, next/navigation
 */
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NavLink } from "../Header.types";
import AuthButtons from "./AuthButtons";

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
  session: { user?: { name?: string; email?: string } } | null;
  pendingSignOut: boolean;
  headerHeight: number;
  headerRef: React.RefObject<HTMLElement | null>;
  onScrollTo: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
  mobileMenuPanelRef: React.RefObject<HTMLDivElement | null>;
  mobileMenuButtonsRef: React.RefObject<HTMLDivElement | null>;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  links,
  session,
  pendingSignOut,
  headerHeight,
  headerRef,
  onScrollTo,
  onSignOut,
  onDeleteAccount,
  onSignIn,
  onSignUp,
  mobileMenuRef,
  mobileMenuPanelRef,
  mobileMenuButtonsRef,
}) => {
  const router = useRouter();

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={mobileMenuRef}
        className="mobile-menu-backdrop fixed bg-black/60 backdrop-blur-sm min-[800px]:hidden transition-opacity duration-300 opacity-100 z-[99]"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'auto',
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        onMouseDown={(e) => {
          const target = e.target as Node | null;
          if (headerRef.current && target && (
            headerRef.current === target ||
            headerRef.current.contains(target)
          )) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        onTouchStart={(e) => {
          const target = e.target as Node | null;
          if (headerRef.current && target && (
            headerRef.current === target ||
            headerRef.current.contains(target)
          )) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (e.target === e.currentTarget) {
            e.preventDefault();
            onClose();
          }
        }}
        onClick={(e) => {
          const target = e.target as Node | null;
          if (headerRef.current && target && (
            headerRef.current === target ||
            headerRef.current.contains(target)
          )) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        aria-hidden={false}
      />

      {/* Menu Panel */}
      <div
        ref={mobileMenuPanelRef}
        className={`fixed right-0 w-56 bg-black/95 backdrop-blur-sm border-l border-white/30 shadow-2xl z-[99] min-[800px]:hidden flex flex-col transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          top: 0,
          height: `100vh`,
          maxHeight: `100vh`,
          minHeight: '100vh',
          overflow: 'hidden',
          pointerEvents: isOpen ? 'auto' : 'none',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          paddingTop: `${headerHeight}px`
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0 pb-2" style={{ minHeight: 0 }}>
          <div className="flex flex-col space-y-2">
            {links.map((link) =>
              link.isScroll ? (
                <a
                  key={link.name}
                  href={link.href}
                  className="px-5 py-4 text-white hover:text-turquoise-300 hover:bg-turquoise-500/10 rounded-md font-semibold text-lg transition-all duration-200 active:scale-[0.98]"
                  onClick={(e) => {
                    onScrollTo(e, link.href.split('#')[1]);
                    onClose();
                  }}
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={true}
                  className="px-5 py-4 text-white hover:text-turquoise-300 hover:bg-turquoise-500/10 rounded-md font-semibold text-lg transition-all duration-200 active:scale-[0.98]"
                  onClick={onClose}
                >
                  {link.name}
                </Link>
              )
            )}
          </div>
        </nav>

        <div
          ref={mobileMenuButtonsRef}
          className="flex-shrink-0 px-4 pb-4 pt-4 border-t border-white/10"
          style={{
            flexShrink: 0,
            minHeight: 'fit-content',
            position: 'relative',
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)'
          }}
        >
          {session && !pendingSignOut ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                  const isOnStudyPage = typeof window !== 'undefined' && window.location.pathname === '/study';
                  if (isOnStudyPage) {
                    window.dispatchEvent(new CustomEvent('replay-tutorial'));
                  } else {
                    router.push('/study?tutorial=true');
                  }
                }}
                className="w-full px-5 py-3 bg-white/10 text-white font-semibold rounded-md hover:bg-white/20 transition-colors"
              >
                Replay Tutorial
              </button>
              <button
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="w-full px-5 py-4 bg-gradient-to-r from-turquoise-600 to-turquoise-500 text-white text-base font-semibold rounded-md shadow-lg hover:from-turquoise-500 hover:to-turquoise-400 transition-all duration-200 active:scale-[0.98]"
              >
                Sign Out
              </button>
              <button
                onClick={() => {
                  onClose();
                  onDeleteAccount();
                }}
                className="w-full px-5 py-3 text-red-400 text-base font-semibold rounded-md border border-red-400/30 hover:bg-red-400/10 transition-all duration-200 active:scale-[0.98]"
              >
                Delete Account
              </button>
            </div>
          ) : (
            <AuthButtons
              scrolled={false}
              onSignIn={onSignIn}
              onSignUp={onSignUp}
              isMobile={true}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default MobileMenu;

