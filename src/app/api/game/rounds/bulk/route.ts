/**
 * Bulk Round Operations API
 * 
 * Handles bulk operations on rounds (e.g., delete all for a user)
 */
import { NextRequest } from 'next/server';
import { getAdminSupabaseClient } from '../../../_shared/clients/supabase';
import { createSuccessResponse } from '../../../_shared/utils/response';
import { withErrorHandling, withMethodValidation, composeMiddleware } from '../../../_shared/middleware/errorHandler';
import { AppError, ErrorCodes, ValidationError } from '@/utils/errorHandling';

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

  const supabase = getAdminSupabaseClient();

  // First get all round IDs for the user
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id')
    .eq('user_id', userId);

  if (roundsError) {
    throw new AppError(
      `Failed to fetch user rounds: ${roundsError.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: roundsError },
      'Failed to delete rounds. Please try again.'
    );
  }

  if (!rounds || rounds.length === 0) {
    return createSuccessResponse({ 
      message: 'No rounds found for user',
      deletedRounds: 0,
      deletedMatches: 0
    });
  }

  const roundIds = rounds.map(round => round.id);

  // Delete all matches for these rounds
  const { error: matchesError } = await supabase
    .from('matches')
    .delete()
    .in('round_id', roundIds);

  if (matchesError) {
    throw new AppError(
      `Failed to delete matches: ${matchesError.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: matchesError },
      'Failed to delete rounds. Please try again.'
    );
  }

  // Delete all rounds for the user
  const { error: roundsDeleteError } = await supabase
    .from('rounds')
    .delete()
    .eq('user_id', userId);

  if (roundsDeleteError) {
    throw new AppError(
      `Failed to delete rounds: ${roundsDeleteError.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: roundsDeleteError },
      'Failed to delete rounds. Please try again.'
    );
  }

  return createSuccessResponse({ 
    message: 'All rounds deleted successfully',
    deletedRounds: rounds.length
  });
}

// Export handlers with middleware
export const DELETE = composeMiddleware(
  withMethodValidation(['DELETE']),
  withErrorHandling
)(deleteAllRounds); 