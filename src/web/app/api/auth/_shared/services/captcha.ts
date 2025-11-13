/**
 * @fileoverview hCaptcha verification service for validating signup requests.
 * @module src/web/app/api/auth/_shared/services/captcha.ts
 * @dependencies node-fetch, @/lib/utils/logger
 */
import fetch from 'node-fetch';
import { CaptchaVerificationResult } from '../types/auth';
import { logger } from '@/lib/utils/logger';

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
    logger.warn('CAPTCHA verification failed: token missing');
    return { success: false, error: 'CAPTCHA token missing' };
  }
  
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    logger.error('Missing HCAPTCHA_SECRET_KEY environment variable');
    return { success: false, error: 'CAPTCHA service not configured' };
  }
  
  try {
    logger.debug('Starting CAPTCHA verification', { 
      hasToken: !!token, 
      tokenLength: token.length,
      hasSecret: !!secret 
    });
    
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `response=${encodeURIComponent(token)}&secret=${encodeURIComponent(secret)}`,
    });
    
    logger.debug('CAPTCHA API response received', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('CAPTCHA verification API response not OK', { 
        status: response.status,
        statusText: response.statusText,
        errorText 
      });
      return { success: false, error: 'CAPTCHA verification service unavailable' };
    }
    
    const data = await response.json();
    logger.debug('CAPTCHA verification response data', { success: data.success });
    
    if (!data.success) {
      logger.warn('CAPTCHA verification failed', { 
        errorCodes: data['error-codes'],
        challengeTs: data['challenge_ts'],
        hostname: data['hostname']
      });
      return { success: false, error: 'CAPTCHA verification failed' };
    }
    
    logger.debug('CAPTCHA verification successful');
    return { success: true };
  } catch (error: any) {
    logger.error('CAPTCHA verification error', error, {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
    return { success: false, error: 'CAPTCHA verification service error' };
  }
} 