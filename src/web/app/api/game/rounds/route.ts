/**
 * @fileoverview Creates new game rounds and retrieves round summaries for the flashcard workflow.
 * @module src/web/app/api/game/rounds/route.ts
 * @dependencies next/server, @/app/api/_shared/utils/response, @/app/api/_shared/utils/validation, @/lib/utils/logger
 */
import { NextRequest } from 'next/server';
import { withErrorHandling, withMethodValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { success } from '@/lib/api/responseHelpers';
import { createRound, getUserRounds } from '@/services/flashcard/roundManager';

const handlePost = async (req: NextRequest) => {
  const result = await createRound(req);
  return success(result);
};

const handleGet = async (req: NextRequest) => {
  const result = await getUserRounds({ req });
  const response = success(result);
  // Add aggressive caching for faster loads - rounds don't change frequently
  response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=60');
  return response;
};

export const POST = composeMiddleware(
  withMethodValidation(['POST']),
  withErrorHandling
)(handlePost);

export const GET = composeMiddleware(
  withMethodValidation(['GET']),
  withErrorHandling
)(handleGet);