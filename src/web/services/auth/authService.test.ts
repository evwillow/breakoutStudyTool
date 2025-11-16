import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signInWithCredentials,
  signInWithProvider,
  signOutUser,
  updateTutorialCompletion,
  handleSignupRequest,
} from './authService';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

// Mock other dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(() => Promise.resolve(null)),
  signupLimiter: {},
}));

vi.mock('@/app/api/_shared/utils/validation', () => ({
  validateOrThrow: vi.fn((data) => data),
  commonSchemas: {
    signup: {},
  },
}));

vi.mock('@/app/api/auth/_shared/services/captcha', () => ({
  verifyCaptcha: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('@/app/api/auth/_shared/services/passwordService', () => ({
  validatePassword: vi.fn(() => ({ isValid: true })),
}));

vi.mock('@/app/api/auth/_shared/services/userService', () => ({
  userExists: vi.fn(() => Promise.resolve(false)),
  createUser: vi.fn(() => Promise.resolve({ id: '123', email: 'test@example.com', username: 'test' })),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/utils/errorHandling', () => ({
  ValidationError: class extends Error {
    constructor(message: string, code: string, status: number, data: unknown, userMessage: string) {
      super(message);
      this.name = 'ValidationError';
      (this as any).code = code;
      (this as any).status = status;
      (this as any).data = data;
      (this as any).userMessage = userMessage;
    }
  },
  ErrorCodes: {
    AUTH_RATE_LIMIT: 'AUTH_RATE_LIMIT',
    VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signInWithCredentials', () => {
    it('should call signIn with credentials', async () => {
      const { signIn } = await import('next-auth/react');
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: null });

      const credentials = { email: 'test@example.com', password: 'password123' };
      const updateSession = vi.fn();

      await signInWithCredentials(credentials, updateSession);

      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        redirect: false,
        ...credentials,
      });
    });

    it('should call updateSession on successful sign in', async () => {
      const { signIn } = await import('next-auth/react');
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: null });

      const updateSession = vi.fn().mockResolvedValue({});

      await signInWithCredentials({ email: 'test@example.com', password: 'password123' }, updateSession);

      expect(updateSession).toHaveBeenCalled();
    });

    it('should not call updateSession when sign in fails', async () => {
      const { signIn } = await import('next-auth/react');
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials', status: 401, url: null });

      const updateSession = vi.fn();

      await signInWithCredentials({ email: 'test@example.com', password: 'wrong' }, updateSession);

      expect(updateSession).not.toHaveBeenCalled();
    });
  });

  describe('signInWithProvider', () => {
    it('should call signIn with provider', async () => {
      const { signIn } = await import('next-auth/react');
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: null });

      await signInWithProvider('google', { callbackUrl: '/dashboard' });

      expect(mockSignIn).toHaveBeenCalledWith('google', {
        redirect: true,
        callbackUrl: '/dashboard',
      });
    });

    it('should use redirect: true by default', async () => {
      const { signIn } = await import('next-auth/react');
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: null });

      await signInWithProvider('google');

      expect(mockSignIn).toHaveBeenCalledWith('google', expect.objectContaining({
        redirect: true,
      }));
    });
  });

  describe('signOutUser', () => {
    it('should call signOut with normalized options', async () => {
      const { signOut } = await import('next-auth/react');
      const mockSignOut = vi.mocked(signOut);
      mockSignOut.mockResolvedValue(undefined);

      // Mock window.location
      const mockReplace = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { replace: mockReplace, href: 'http://localhost:3000' },
        writable: true,
      });

      await signOutUser({ callbackUrl: '/login' });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should handle missing callbackUrl', async () => {
      const { signOut } = await import('next-auth/react');
      const mockSignOut = vi.mocked(signOut);
      mockSignOut.mockResolvedValue(undefined);

      const mockReplace = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { replace: mockReplace, href: 'http://localhost:3000' },
        writable: true,
      });

      await signOutUser({});

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('updateTutorialCompletion', () => {
    it('should update tutorial completion status', async () => {
      const { getServerSupabaseClient } = await import('@/lib/supabase');
      const mockSupabase = vi.mocked(getServerSupabaseClient);
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });
      mockSupabase.mockReturnValue({
        from: mockFrom,
      } as any);

      await updateTutorialCompletion('user123', true);

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith({ tutorial_completed: true });
    });

    it('should throw error on database failure', async () => {
      const { getServerSupabaseClient } = await import('@/lib/supabase');
      const mockSupabase = vi.mocked(getServerSupabaseClient);
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });
      mockSupabase.mockReturnValue({
        from: mockFrom,
      } as any);

      await expect(updateTutorialCompletion('user123', true)).rejects.toThrow('Failed to update tutorial completion status');
    });
  });

  describe('handleSignupRequest', () => {
    it('should successfully create a new user', async () => {
      const request = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          captchaToken: 'test-token',
        }),
      });

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const response = await handleSignupRequest(request);

      expect(response.message).toBe('User registered successfully');
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe('newuser@example.com');
    });

    it('should throw error for missing environment variables', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const request = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          captchaToken: 'test-token',
        }),
      });

      await expect(handleSignupRequest(request)).rejects.toThrow('Missing required environment variables');

      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
    });

    it('should throw error for invalid request body', async () => {
      const request = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: 'invalid json',
      });

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.NEXTAUTH_SECRET = 'test-secret';

      await expect(handleSignupRequest(request)).rejects.toThrow('Invalid request body');
    });
  });
});

