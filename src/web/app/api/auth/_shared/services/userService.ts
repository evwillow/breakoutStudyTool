/**
 * @fileoverview Supabase user service for creating accounts, fetching profiles, and managing auth metadata.
 * @module src/web/app/api/auth/_shared/services/userService.ts
 * @dependencies @/lib/utils/logger, @/app/api/_shared/utils/response
 */
import { getServerSupabaseClient } from '@/lib/supabase';
import { AuthUser, SignupRequest } from '../types/auth';
import { DatabaseError, ErrorCodes } from '@/lib/utils/errorHandling';
import { logger } from '@/lib/utils/logger';
import { hashPassword } from './passwordService';

/**
 * Check if user exists by email
 */
export async function userExists(email: string): Promise<boolean> {
  try {
    // Check if we're in mock mode (no Supabase configured)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.info('Running in mock mode - user does not exist', { email: email.split('@')[1] });
      return false; // In mock mode, assume user doesn't exist
    }

    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      logger.error('Error checking user existence', error, { email: email.split('@')[1] });
      throw new DatabaseError(
        'Failed to check user existence',
        ErrorCodes.DB_QUERY_ERROR,
        500,
        { originalError: error.message },
        'Unable to verify user account. Please try again.'
      );
    }

    return !!data;
  } catch (error: any) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    // If it's a Supabase configuration error, fall back to mock mode
    if (error.message.includes('Supabase not configured') || error.message.includes('missing')) {
      logger.info('Supabase not configured, running in mock mode', { email: email.split('@')[1] });
      return false; // In mock mode, assume user doesn't exist
    }
    
    logger.error('Unexpected error checking user existence', error);
    throw new DatabaseError(
      'Database connection error',
      ErrorCodes.DB_CONNECTION_ERROR,
      500,
      { originalError: error.message },
      'Unable to connect to user database. Please try again later.'
    );
  }
}

/**
 * Create a new user
 */
export async function createUser(signupData: SignupRequest): Promise<AuthUser> {
  const { email, password } = signupData;
  
  try {
    // Check if we're in mock mode (no Supabase configured)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.info('Running in mock mode - creating mock user', { email: email.split('@')[1] });
      // Return a mock user for development
      return {
        id: `mock-${Date.now()}`,
        email,
        password: 'mock-password', // Mock password for development
        username: email.split('@')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Insert user into database (removed username field since column doesn't exist)
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email,
        password: hashedPassword,
      }])
      .select()
      .single();

    if (error) {
      logger.error('User creation failed', error, { 
        email: email.split('@')[1],
        errorCode: error.code 
      });
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        throw new DatabaseError(
          'Email already registered',
          ErrorCodes.DB_CONSTRAINT_VIOLATION,
          400,
          { field: 'email' },
          'An account with this email address already exists.'
        );
      }
      
      if (error.message.includes('permission denied')) {
        throw new DatabaseError(
          'Database permission error',
          ErrorCodes.DB_CONNECTION_ERROR,
          500,
          { originalError: error.message },
          'Service configuration error. Please contact support.'
        );
      }
      
      throw new DatabaseError(
        'Failed to create user account',
        ErrorCodes.DB_QUERY_ERROR,
        500,
        { originalError: error.message },
        'Unable to create your account. Please try again.'
      );
    }

    if (!data) {
      throw new DatabaseError(
        'User creation returned no data',
        ErrorCodes.DB_QUERY_ERROR,
        500,
        {},
        'Account creation failed. Please try again.'
      );
    }

    logger.info('User created successfully', { 
      userId: data.id,
      email: email.split('@')[1] 
    });

    return data as AuthUser;
  } catch (error: any) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error('Unexpected error creating user', error);
    throw new DatabaseError(
      'Database error creating user',
      ErrorCodes.DB_CONNECTION_ERROR,
      500,
      { originalError: error.message },
      'Unable to create your account. Please try again later.'
    );
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    // Check if we're in mock mode (no Supabase configured)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.info('Running in mock mode - no user found', { email: email.split('@')[1] });
      return null; // In mock mode, no users exist
    }

    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, password, created_at, updated_at')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching user by email', error);
      throw new DatabaseError(
        'Failed to fetch user',
        ErrorCodes.DB_QUERY_ERROR,
        500,
        { originalError: error.message },
        'Unable to verify user account. Please try again.'
      );
    }

    return data as AuthUser | null;
  } catch (error: any) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    // If it's a Supabase configuration error, fall back to mock mode
    if (error.message.includes('Supabase not configured') || error.message.includes('missing')) {
      logger.info('Supabase not configured, running in mock mode', { email: email.split('@')[1] });
      return null; // In mock mode, no users exist
    }
    
    logger.error('Unexpected error fetching user', error);
    throw new DatabaseError(
      'Database connection error',
      ErrorCodes.DB_CONNECTION_ERROR,
      500,
      { originalError: error.message },
      'Unable to connect to user database. Please try again later.'
    );
  }
} 