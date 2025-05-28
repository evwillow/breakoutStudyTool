/**
 * User Signup API Route
 * 
 * Handles user registration with validation, rate limiting, and security measures
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse } from '../../_shared/utils/response';
import { withErrorHandling, withEnvironmentValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { validateOrThrow, commonSchemas } from '../../_shared/utils/validation';
import { rateLimit, signupLimiter } from '@/lib/rateLimit';
import { ValidationError, ErrorCodes } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';

// Import auth services
import { verifyCaptcha } from '../_shared/services/captcha';
import { validatePassword } from '../_shared/services/passwordService';
import { userExists, createUser } from '../_shared/services/userService';
import { SignupRequest, SignupResponse } from '../_shared/types/auth';

/**
 * Handle user signup
 */
async function handleSignup(req: NextRequest): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, signupLimiter);
  if (rateLimitResponse) return NextResponse.json(rateLimitResponse, { status: 429 });

  // Parse and validate request body
  const body = await req.json();
  const validatedData = validateOrThrow<SignupRequest>(body, commonSchemas.signup);
  
  const { email, password, captchaToken } = validatedData;

  logger.info('Signup attempt', { 
    email: email.split('@')[1], // Log domain only for privacy
    hasCaptcha: !!captchaToken 
  });

  // Validate password complexity
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new ValidationError(
      passwordValidation.reason!,
      ErrorCodes.VALIDATION_INVALID_FORMAT,
      400,
      { field: 'password' },
      passwordValidation.reason!
    );
  }

  // Verify CAPTCHA token
  const captchaResult = await verifyCaptcha(captchaToken);
  if (!captchaResult.success) {
    throw new ValidationError(
      captchaResult.error || 'CAPTCHA verification failed',
      ErrorCodes.VALIDATION_ERROR,
      400,
      { field: 'captcha' },
      'Please complete the CAPTCHA verification.'
    );
  }

  // Check if user already exists
  const exists = await userExists(email);
  if (exists) {
    throw new ValidationError(
      'Email already registered',
      ErrorCodes.VALIDATION_ERROR,
      400,
      { field: 'email' },
      'An account with this email address already exists.'
    );
  }

  // Create the user
  const newUser = await createUser(validatedData);

  // Return success response
  const response: SignupResponse = {
    message: 'User registered successfully',
    user: {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username || newUser.email.split('@')[0],
    },
  };

  logger.info('User signup completed successfully', { 
    userId: newUser.id,
    email: email.split('@')[1] 
  });

  return createSuccessResponse(response);
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