/**
 * CAPTCHA Verification Service
 * Handles hCaptcha token verification with proper error handling
 */
import { CaptchaVerificationResult } from '../types/auth';
import { logger } from '@/utils/logger';

/**
 * Verify hCaptcha token
 */
export async function verifyCaptcha(token?: string): Promise<CaptchaVerificationResult> {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Development environment: CAPTCHA verification bypassed');
    return { success: true };
  }
  
  if (!token) {
    return { success: false, error: 'CAPTCHA token missing' };
  }
  
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    logger.error('Missing HCAPTCHA_SECRET_KEY environment variable');
    return { success: false, error: 'CAPTCHA service not configured' };
  }
  
  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `response=${encodeURIComponent(token)}&secret=${encodeURIComponent(secret)}`,
    });
    
    if (!response.ok) {
      logger.error('CAPTCHA verification API response not OK', { status: response.status });
      return { success: false, error: 'CAPTCHA verification service unavailable' };
    }
    
    const data = await response.json();
    
    if (!data.success) {
      logger.warn('CAPTCHA verification failed', { errorCodes: data['error-codes'] });
      return { success: false, error: 'CAPTCHA verification failed' };
    }
    
    return { success: true };
  } catch (error: any) {
    logger.error('CAPTCHA verification error', error);
    return { success: false, error: 'CAPTCHA verification service error' };
  }
} 