import { signIn, signOut } from 'next-auth/react';
import type { SignupRequest, SignupResponse } from '@breakout-study-tool/shared';

interface Credentials {
  email?: string;
  password?: string;
  [key: string]: unknown;
}

export async function signInWithCredentials(
  credentials: Credentials,
  updateSession?: (() => Promise<unknown>) | null
) {
  const result = await signIn('credentials', {
    redirect: false,
    ...credentials,
  });

  if (!result?.error && typeof updateSession === 'function') {
    try {
      await updateSession();
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }

  return result;
}

export async function signInWithProvider(
  provider: string,
  options: Record<string, unknown> = {},
  updateSession?: (() => Promise<unknown>) | null
) {
  const finalOptions = {
    redirect: options.redirect ?? true,
    ...options,
  };

  const result = await signIn(provider, finalOptions);

  if (!finalOptions.redirect && !result?.error && typeof updateSession === 'function') {
    try {
      await updateSession();
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }

  return result;
}

function getDefaultOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }
  return '';
}

function ensureAbsoluteUrl(url?: string | null) {
  const origin = getDefaultOrigin();
  const fallback = origin ? `${origin}/` : '/';

  if (!url) {
    return fallback;
  }

  try {
    const absolute = new URL(url, origin || undefined);
    return absolute.toString();
  } catch {
    return fallback;
  }
}

export async function signOutUser(options: Record<string, unknown> = {}) {
  const normalizedOptions =
    typeof options === 'object' && options !== null ? options : {};
  const rawCallbackUrl =
    (normalizedOptions.callbackUrl || normalizedOptions.callbackURL) as string | undefined;

  const finalOptions = {
    redirect: false,
    ...normalizedOptions,
    callbackUrl: ensureAbsoluteUrl(rawCallbackUrl),
  };

  const targetUrl = finalOptions.callbackUrl || '/';

  const result = await signOut(finalOptions);

  const resolvedUrl =
    typeof result === 'string'
      ? ensureAbsoluteUrl(result)
      : result && typeof result === 'object' && 'url' in result && result.url
        ? ensureAbsoluteUrl(String(result.url))
        : targetUrl;

  if (typeof window !== 'undefined') {
    window.location.replace(resolvedUrl);
    window.setTimeout(() => {
      if (window.location.href !== resolvedUrl) {
        window.location.assign(resolvedUrl);
      }
    }, 100);
  }

  return result;
}

export async function updateTutorialCompletion(userId: string, completed: boolean) {
  const { getServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from('users')
    .update({ tutorial_completed: completed })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update tutorial completion status: ${error.message}`);
  }
}

export async function handleSignupRequest(req: Request): Promise<SignupResponse> {
  const { rateLimit, signupLimiter } = await import('@/lib/rateLimit');
  const { getServerSupabaseClient } = await import('@/lib/supabase');
  const { validateOrThrow, commonSchemas } = await import('@/app/api/_shared/utils/validation');
  const { verifyCaptcha } = await import('@/app/api/auth/_shared/services/captcha');
  const { validatePassword } = await import('@/app/api/auth/_shared/services/passwordService');
  const { userExists, createUser } = await import('@/app/api/auth/_shared/services/userService');
  const { logger } = await import('@/lib/utils/logger');
  const { ValidationError, ErrorCodes } = await import('@/lib/utils/errorHandling');

  logger.info('Signup request started', {
    url: req.url,
    method: req.method,
    headers: req instanceof Request ? Object.fromEntries(req.headers.entries()) : {},
  });

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.error('Missing environment variables', { missingVars });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  try {
    const rateLimitResponse = await rateLimit(req, signupLimiter);
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for signup');
      throw new ValidationError(
        'Rate limit exceeded',
        ErrorCodes.AUTH_RATE_LIMIT,
        429,
        {},
        'Too many requests. Please try again later.'
      );
    }
  } catch (rateLimitError) {
    logger.error('Rate limiting error', rateLimitError);
  }

  let body: unknown;
  try {
    body = await req.json();
    const payload = body as Record<string, unknown>;
    logger.debug('Signup request body parsed', {
      hasEmail: !!payload.email,
      hasPassword: !!payload.password,
      hasCaptcha: !!payload.captchaToken,
    });
  } catch (parseError) {
    logger.error('Failed to parse request body', parseError);
    throw new Error('Invalid request body');
  }

  const validatedData = validateOrThrow<SignupRequest>(body, commonSchemas.signup);
  const { email, password, captchaToken } = validatedData;

  logger.info('Signup attempt', {
    email: email.split('@')[1],
    hasCaptcha: !!captchaToken,
  });

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    logger.warn('Password validation failed', { reason: passwordValidation.reason });
    throw new ValidationError(
      passwordValidation.reason!,
      ErrorCodes.VALIDATION_INVALID_FORMAT,
      400,
      { validationErrors: { password: passwordValidation.reason } },
      passwordValidation.reason!
    );
  }

  if (process.env.NODE_ENV !== 'development') {
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
  } else {
    logger.info('Development mode: CAPTCHA verification bypassed');
  }

  const supabase = getServerSupabaseClient();

  const exists = await userExists(email);
  if (exists) {
    logger.warn('Signup attempt with existing email', { email: email.split('@')[1] });
    throw new ValidationError(
      'Email already registered',
      ErrorCodes.VALIDATION_ERROR,
      400,
      { validationErrors: { email: 'An account with this email address already exists.' } },
      'An account with this email address already exists.'
    );
  }

  const newUser = await createUser(validatedData);

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
    email: email.split('@')[1],
  });

  return response;
}

