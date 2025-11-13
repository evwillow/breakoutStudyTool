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