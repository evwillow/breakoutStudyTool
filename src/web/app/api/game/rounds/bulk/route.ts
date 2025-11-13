/**
 * @fileoverview Bulk operations for updating or creating multiple rounds at once.
 * @module src/web/app/api/game/rounds/bulk/route.ts
 * @dependencies next/server, @/app/api/_shared/utils/response
 */
import { NextRequest } from 'next/server';
import { withErrorHandling, withMethodValidation, composeMiddleware } from '../../../_shared/middleware/errorHandler';
import { AppError, ErrorCodes, ValidationError } from '@/lib/utils/errorHandling';
import { success } from '@/lib/api/responseHelpers';
import { deleteAllRoundsForUser } from '@/services/flashcard/roundManager';

/**
 * Delete all rounds for a user
 */
async function deleteAllRounds(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    throw new ValidationError(
      'User ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'User ID parameter is required.'
    );
  }

  const result = await deleteAllRoundsForUser(userId);

  if (result.deletedRounds === 0) {
    return success({
      message: 'No rounds found for user',
      deletedRounds: 0,
      deletedMatches: 0,
    });
  }

  return success({
    message: 'All rounds deleted successfully',
    deletedRounds: result.deletedRounds,
  });
}

// Export handlers with middleware
export const DELETE = composeMiddleware(
  withMethodValidation(['DELETE']),
  withErrorHandling
)(deleteAllRounds); 