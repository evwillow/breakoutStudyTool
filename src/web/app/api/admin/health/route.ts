/**
 * Admin Health Check API
 * 
 * Consolidated endpoint for system health monitoring and diagnostics
 * Only available in development or with proper admin authentication
 */
import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '../../_shared/utils/response';
import { withErrorHandling, withEnvironmentValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { testDatabaseConnection, validateDatabaseSchema } from '../../_shared/clients/supabase';
import { HealthCheckResponse, ServiceStatus } from '../../_shared/types/api';
// Google Drive removed - using local data instead
import { AppError, ErrorCodes } from '@/lib/utils/errorHandling';

/**
 * Check database service health
 */
async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    const connectionTest = await testDatabaseConnection();
    const schemaTest = await validateDatabaseSchema();
    
    const responseTime = Date.now() - startTime;
    
    if (!connectionTest.success) {
      return {
        status: 'down',
        responseTime,
        error: connectionTest.error,
        lastChecked: new Date().toISOString()
      };
    }
    
    if (!schemaTest.success) {
      return {
        status: 'degraded',
        responseTime,
        error: `Missing tables: ${schemaTest.missingTables?.join(', ')}`,
        lastChecked: new Date().toISOString()
      };
    }
    
    return {
      status: 'up',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check local data service health
 */
async function checkLocalDataHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Check if local data directory exists
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(process.cwd(), '..', '..', 'src', 'data-processing', 'ds', 'quality_breakouts');
    
    if (!fs.existsSync(dataPath)) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: 'Local data directory not found',
        lastChecked: new Date().toISOString()
      };
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'up',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check authentication service health
 */
async function checkAuthHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Basic environment variable check for auth
    const requiredAuthVars = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];
    
    const missingVars = requiredAuthVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: `Missing auth environment variables: ${missingVars.join(', ')}`,
        lastChecked: new Date().toISOString()
      };
    }
    
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Comprehensive health check
 */
async function healthCheck(req: NextRequest) {
  // Only allow in development or with proper admin auth
  if (process.env.NODE_ENV === 'production') {
    // In production, you'd want to check for admin authentication here
    // For now, we'll restrict access
    throw new AppError(
      'Health check endpoint not available in production',
      ErrorCodes.AUTH_UNAUTHORIZED,
      403,
      {},
      'Access denied.'
    );
  }

  const [databaseStatus, localDataStatus, authStatus] = await Promise.all([
    checkDatabaseHealth(),
    checkLocalDataHealth(),
    checkAuthHealth()
  ]);

  // Determine overall system status
  const services = { database: databaseStatus, localData: localDataStatus, auth: authStatus };
  const allServicesUp = Object.values(services).every(service => service.status === 'up');
  const anyServiceDown = Object.values(services).some(service => service.status === 'down');
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (allServicesUp) {
    overallStatus = 'healthy';
  } else if (anyServiceDown) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
    environment: process.env.NODE_ENV || 'unknown'
  };

  return createSuccessResponse(response);
}

// Export with middleware
export const GET = composeMiddleware(
  withEnvironmentValidation([
    'NEXT_PUBLIC_SUPABASE_URL'
  ]),
  withErrorHandling
)(healthCheck); 