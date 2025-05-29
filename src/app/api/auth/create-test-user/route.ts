/**
 * Create Test User API Route
 * 
 * Development-only route to create a test user for authentication testing
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '../../_shared/utils/response';
import { logger } from '../../../../utils/logger';
import { userExists, createUser } from '../_shared/services/userService';
import { AppError, ErrorCodes } from '../../../../utils/errorHandling';

/**
 * Handle test user creation
 */
async function handleCreateTestUser(req: NextRequest): Promise<NextResponse> {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return createErrorResponse(
      new AppError(
        'Test user creation only available in development',
        ErrorCodes.AUTH_UNAUTHORIZED,
        403
      ),
      403
    );
  }

  try {
    const testEmail = 'evan_maus@berkeley.edu';
    const testPassword = 'test123';

    logger.info('Creating test user', { email: testEmail.split('@')[1] });

    // Check if user already exists
    const exists = await userExists(testEmail);
    if (exists) {
      return createSuccessResponse({
        message: 'Test user already exists',
        user: {
          email: testEmail,
          password: testPassword
        }
      });
    }

    // Create the test user
    const newUser = await createUser({
      email: testEmail,
      password: testPassword
    });

    logger.info('Test user created successfully', { 
      userId: newUser.id,
      email: testEmail.split('@')[1] 
    });

    return createSuccessResponse({
      message: 'Test user created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        password: testPassword
      }
    });

  } catch (error) {
    logger.error('Failed to create test user', error);
    
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to create test user'),
      500
    );
  }
}

// Export for POST method
export const POST = handleCreateTestUser; 