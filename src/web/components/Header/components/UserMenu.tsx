/**
 * @fileoverview User menu dropdown component for authenticated users.
 * @module src/web/components/Header/components/UserMenu.tsx
 * @dependencies React, next/navigation
 */
"use client";

import React from "react";
import { useRouter } from "next/navigation";

export interface UserMenuProps {
  session: { user?: { name?: string; email?: string } } | null;
  scrolled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  session,
  scrolled,
  isOpen,
  onToggle,
  onSignOut,
  onDeleteAccount,
  menuRef,
}) => {
  const router = useRouter();

  if (!session) {
    return null;
  }

  const username = session.user?.name
    ? session.user.name.includes('@')
      ? session.user.name.split('@')[0]
      : session.user.name
    : session.user?.email
    ? session.user.email.split('@')[0]
    : 'User';

  return (
    <div className="relative hidden min-[800px]:block" ref={menuRef}>
      <button
        onClick={onToggle}
        data-tutorial-profile
        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm transition whitespace-nowrap ${
          scrolled ? "text-gray-800 hover:bg-gray-100" : "text-white hover:bg-white/10"
        }`}
      >
        Hi, {username}
        <svg className="h-4 w-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 z-[110]">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-turquoise-900/25 via-transparent to-transparent blur-3xl"></div>
          <div className="relative overflow-hidden rounded-3xl border border-turquoise-200/60 bg-white shadow-2xl shadow-turquoise-950/20">
            <div className="flex flex-col gap-1 p-2">
              <div className="px-4 py-3">
                <p className="text-xs text-turquoise-400/80 mb-1">Signed in as</p>
                <p className="text-sm font-medium text-turquoise-800 truncate">
                  {session.user?.email ? session.user.email.split('@')[0] : 'user'}
                </p>
              </div>
              <div className="h-px bg-turquoise-200/40 mx-2"></div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle();
                  const isOnStudyPage = typeof window !== 'undefined' && window.location.pathname === '/study';
                  if (isOnStudyPage) {
                    window.dispatchEvent(new CustomEvent('replay-tutorial'));
                  } else {
                    router.push('/study?tutorial=true');
                  }
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-turquoise-700 hover:bg-turquoise-50/50 rounded-md transition-colors"
              >
                Replay Tutorial
              </button>
              <div className="h-px bg-turquoise-200/40 mx-2"></div>
              <button
                onClick={() => {
                  onToggle();
                  onSignOut();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-turquoise-700 hover:bg-turquoise-50/50 rounded-md transition-colors"
              >
                Sign Out
              </button>
              <div className="h-px bg-turquoise-200/40 mx-2"></div>
              <button
                onClick={() => {
                  onToggle();
                  onDeleteAccount();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 rounded-md transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

