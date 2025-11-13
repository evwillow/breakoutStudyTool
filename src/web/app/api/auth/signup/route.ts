/**
 * @fileoverview Handles user signup requests, validation, and Supabase user creation.
 * @module src/web/app/api/auth/signup/route.ts
 * @dependencies next/server, @/app/api/_shared/utils/response, @/app/api/_shared/utils/validation, @/app/api/auth/_shared/services/userService, @/lib/utils/logger
 */
import { NextRequest } from 'next/server';
import { withErrorHandling, withEnvironmentValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { success } from '@/lib/api/responseHelpers';
import { handleSignupRequest } from '@/services/auth/authService';
import { logger } from '@/lib/utils/logger';

/**
 * Handle user signup
 */
async function handleSignup(req: NextRequest) {
  const response = await handleSignupRequest(req);
  return success(response);
}

// Export with middleware composition
export const POST = composeMiddleware(
  withEnvironmentValidation([
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET'
  ]),
  withErrorHandling
)(handleSignup); 