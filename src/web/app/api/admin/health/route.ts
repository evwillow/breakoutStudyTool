/**
 * @fileoverview Comprehensive health-check endpoint verifying database, local data, and auth status.
 * @module src/web/app/api/admin/health/route.ts
 * @dependencies next/server, ../../_shared/utils/response, ../../_shared/middleware/errorHandler, ../../_shared/clients/supabase, @breakout-study-tool/shared, @/lib/utils/errorHandling
 */
/**
 * Admin Health Check API
 * 
 * Consolidated endpoint for system health monitoring and diagnostics
 * Only available in development or with proper admin authentication
 */
import { withErrorHandling, withEnvironmentValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { NextRequest } from 'next/server';
import { success } from '@/lib/api/responseHelpers';
import { healthCheck } from '@/services/flashcard/roundManager';

const handleGet = async (req: NextRequest) => {
  const result = await healthCheck(req);
  return success(result);
};

export const GET = composeMiddleware(
  withEnvironmentValidation([
    'NEXT_PUBLIC_SUPABASE_URL'
  ]),
  withErrorHandling
)(handleGet);