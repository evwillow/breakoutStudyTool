/**
 * @fileoverview Updates and retrieves specific round details identified by round ID.
 * @module src/web/app/api/game/rounds/[id]/route.ts
 * @dependencies next/server, @/app/api/_shared/utils/response, @/app/api/_shared/utils/validation
 */
import { NextRequest } from 'next/server';
import { withErrorHandling, withMethodValidation, composeMiddleware } from '../../../_shared/middleware/errorHandler';
import { success } from '@/lib/api/responseHelpers';
import { AppError, ErrorCodes, ValidationError } from '@/lib/utils/errorHandling';
import { getRoundById, updateRoundById, deleteRoundById } from '@/services/flashcard/roundManager';

/**
 * Get a specific round by ID
 */
async function getRound(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roundId } = await params;

  if (!roundId) {
    throw new ValidationError(
      'Round ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Round ID parameter is required.'
    );
  }

  const round = await getRoundById(roundId);
  return success(round);
}

/**
 * Update a specific round
 */
async function updateRound(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roundId } = await params;
  
  let body;
  try {
    body = await req.json();
  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    throw new AppError(
      'Invalid JSON in request body',
      ErrorCodes.VALIDATION_ERROR,
      400,
      { parseError: parseError instanceof Error ? parseError.message : String(parseError) },
      'Invalid request format. Please check your data and try again.'
    );
  }

  if (!roundId) {
    throw new ValidationError(
      'Round ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Round ID parameter is required.'
    );
  }

  const updatedRound = await updateRoundById(roundId, body);
  return success(updatedRound);
}

/**
 * Delete a specific round
 */
async function deleteRound(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roundId } = await params;

  if (!roundId) {
    throw new ValidationError(
      'Round ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Round ID parameter is required.'
    );
  }

  await deleteRoundById(roundId);
  return success({ message: 'Round deleted successfully' });
}

// Export handlers with middleware
export const GET = composeMiddleware(
  withMethodValidation(['GET']),
  withErrorHandling
)(getRound);

export const PUT = composeMiddleware(
  withMethodValidation(['PUT']),
  withErrorHandling
)(updateRound);

export const DELETE = composeMiddleware(
  withMethodValidation(['DELETE']),
  withErrorHandling
)(deleteRound); 