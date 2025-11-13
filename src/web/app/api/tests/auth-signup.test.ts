import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../auth/signup/route';
import * as authService from '@/services/auth/authService';

// Mock dependencies
vi.mock('@/services/auth/authService', () => ({
  handleSignupRequest: vi.fn(),
}));

vi.mock('@/lib/api/responseHelpers', () => ({
  success: vi.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
}));

vi.mock('../../_shared/middleware/errorHandler', () => ({
  withErrorHandling: (handler: any) => handler,
  withEnvironmentValidation: (vars: string[]) => (handler: any) => handler,
  composeMiddleware: (...middlewares: any[]) => (handler: any) => handler,
}));

describe('API: /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.NEXTAUTH_SECRET = 'test-secret';
  });

  describe('POST', () => {
    it('should successfully create a new user', async () => {
      const mockResponse = {
        message: 'User registered successfully',
        user: {
          id: 'user-123',
          email: 'newuser@example.com',
          username: 'newuser',
        },
      };

      vi.mocked(authService.handleSignupRequest).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          captchaToken: 'test-token',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResponse);
      expect(authService.handleSignupRequest).toHaveBeenCalledWith(request);
    });

    it('should handle missing email parameter', async () => {
      vi.mocked(authService.handleSignupRequest).mockRejectedValue(
        new Error('Missing required parameter: email')
      );

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          captchaToken: 'test-token',
        }),
      });

      await expect(POST(request)).rejects.toThrow('Missing required parameter');
    });

    it('should handle missing password parameter', async () => {
      vi.mocked(authService.handleSignupRequest).mockRejectedValue(
        new Error('Missing required parameter: password')
      );

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          captchaToken: 'test-token',
        }),
      });

      await expect(POST(request)).rejects.toThrow('Missing required parameter');
    });

    it('should handle invalid email format', async () => {
      vi.mocked(authService.handleSignupRequest).mockRejectedValue(
        new Error('Invalid email format')
      );

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
          captchaToken: 'test-token',
        }),
      });

      await expect(POST(request)).rejects.toThrow('Invalid email format');
    });

    it('should handle weak password', async () => {
      vi.mocked(authService.handleSignupRequest).mockRejectedValue(
        new Error('Password must be at least 8 characters long')
      );

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
          captchaToken: 'test-token',
        }),
      });

      await expect(POST(request)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should handle existing email', async () => {
      vi.mocked(authService.handleSignupRequest).mockRejectedValue(
        new Error('Email already registered')
      );

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          captchaToken: 'test-token',
        }),
      });

      await expect(POST(request)).rejects.toThrow('Email already registered');
    });

    it('should handle invalid CAPTCHA token', async () => {
      vi.mocked(authService.handleSignupRequest).mockRejectedValue(
        new Error('Invalid CAPTCHA')
      );

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          captchaToken: 'invalid-token',
        }),
      });

      await expect(POST(request)).rejects.toThrow('Invalid CAPTCHA');
    });

    it('should handle server errors', async () => {
      vi.mocked(authService.handleSignupRequest).mockRejectedValue(
        new Error('Internal server error')
      );

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          captchaToken: 'test-token',
        }),
      });

      await expect(POST(request)).rejects.toThrow('Internal server error');
    });
  });
});

