import type { Session } from 'next-auth';

// SessionStatus type - matches next-auth/react status
type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isUnauthenticated: boolean;
  user: Session['user'] | null;
}

export function deriveAuthState(status: SessionStatus, session: Session | null): AuthState {
  const isAuthenticated = status === 'authenticated' && !!session;
  const isLoading = status === 'loading';
  const isUnauthenticated = status === 'unauthenticated';

  return {
    isAuthenticated,
    isLoading,
    isUnauthenticated,
    user: session?.user ?? null,
  };
}

