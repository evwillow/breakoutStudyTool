/**
 * @fileoverview Handles recording of flashcard match results and scoring metadata.
 * @module src/web/app/api/game/matches/route.ts
 * @dependencies next/server, @/app/api/_shared/utils/response, @/app/api/_shared/utils/validation, @/lib/cache/localDataCache, @/lib/utils/logger
 */
import { NextRequest } from 'next/server';
import { withErrorHandling, withMethodValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { success } from '@/lib/api/responseHelpers';
import { logMatch, getMatches } from '@/services/flashcard/roundManager';

const handlePost = async (req: NextRequest) => {
  const result = await logMatch(req);
  return success(result);
};

const handleGet = async (req: NextRequest) => {
  const result = await getMatches(req);
  return success(result);
};

export const POST = composeMiddleware(
  withMethodValidation(['POST']),
  withErrorHandling
)(handlePost);

export const GET = composeMiddleware(
  withMethodValidation(['GET']),
  withErrorHandling
)(handleGet);