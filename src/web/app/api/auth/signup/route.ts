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
import { ValidationError, ErrorCodes } from '@/lib/utils/errorHandling';
import { logger } from '@/lib/utils/logger';

// Import auth services
import { verifyCaptcha } from '../_shared/services/captcha';
import { validatePassword } from '../_shared/services/passwordService';
import { userExists, createUser } from '../_shared/services/userService';
import { SignupRequest, SignupResponse } from '../_shared/types/auth';

/**
 * Handle user signup
 */
async function handleSignup(req: NextRequest): Promise<NextResponse> {
  try {
    logger.info('Signup request started', { 
      url: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Check environment variables first
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXTAUTH_SECRET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      logger.error('Missing environment variables', { missingVars });
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Apply rate limiting
    try {
      const rateLimitResponse = await rateLimit(req, signupLimiter);
      if (rateLimitResponse) {
        logger.warn('Rate limit exceeded for signup');
        return NextResponse.json(rateLimitResponse, { status: 429 });
      }
    } catch (rateLimitError) {
      logger.error('Rate limiting error', rateLimitError);
      // Continue without rate limiting if it fails
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
      logger.debug('Signup request body parsed', { 
        hasEmail: !!body.email,
        hasPassword: !!body.password,
        hasCaptcha: !!body.captchaToken
      });
    } catch (parseError) {
      logger.error('Failed to parse request body', parseError);
      throw new Error('Invalid request body');
    }

    let validatedData;
    try {
      validatedData = validateOrThrow<SignupRequest>(body, commonSchemas.signup);
    } catch (validationError) {
      logger.error('Request validation failed', validationError);
      throw validationError;
    }
    
    const { email, password, captchaToken } = validatedData;

    logger.info('Signup attempt', { 
      email: email.split('@')[1], // Log domain only for privacy
      hasCaptcha: !!captchaToken 
    });

    // Validate password complexity
    try {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        logger.warn('Password validation failed', { reason: passwordValidation.reason });
        throw new ValidationError(
          passwordValidation.reason!,
          ErrorCodes.VALIDATION_INVALID_FORMAT,
          400,
          { field: 'password' },
          passwordValidation.reason!
        );
      }
    } catch (passwordError) {
      logger.error('Password validation error', passwordError);
      throw passwordError;
    }

    // Verify CAPTCHA token (bypass in development)
    if (process.env.NODE_ENV === 'development') {
      logger.info('Development mode: CAPTCHA verification bypassed');
    } else {
      try {
        const captchaResult = await verifyCaptcha(captchaToken);
        if (!captchaResult.success) {
          logger.warn('CAPTCHA verification failed', { error: captchaResult.error });
          throw new ValidationError(
            captchaResult.error || 'CAPTCHA verification failed',
            ErrorCodes.VALIDATION_ERROR,
            400,
            { field: 'captcha' },
            'Please complete the CAPTCHA verification.'
          );
        }
      } catch (captchaError) {
        logger.error('CAPTCHA verification error', captchaError);
        throw captchaError;
      }
    }

    // Check if user already exists
    try {
      logger.debug('Checking if user exists');
      const exists = await userExists(email);
      if (exists) {
        logger.warn('Signup attempt with existing email', { email: email.split('@')[1] });
        throw new ValidationError(
          'Email already registered',
          ErrorCodes.VALIDATION_ERROR,
          400,
          { field: 'email' },
          'An account with this email address already exists.'
        );
      }
    } catch (userExistsError) {
      logger.error('User exists check error', userExistsError);
      throw userExistsError;
    }

    // Create the user
    try {
      logger.debug('Creating new user');
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
    } catch (createUserError) {
      logger.error('User creation error', createUserError);
      throw createUserError;
    }
  } catch (error: any) {
    logger.error('Signup handler error', error, {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error.code
    });
    throw error; // Re-throw to be handled by middleware
  }
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