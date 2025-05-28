/**
 * Game Matches API
 * 
 * Handles logging and retrieving game matches
 */
import { NextRequest } from 'next/server';
import { getAdminSupabaseClient } from '../../_shared/clients/supabase';
import { createSuccessResponse } from '../../_shared/utils/response';
import { withErrorHandling, withMethodValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { validateOrThrow, commonSchemas } from '../../_shared/utils/validation';
import { LogMatchRequest, Match } from '../../_shared/types/api';
import { AppError, ErrorCodes } from '@/utils/errorHandling';

/**
 * Log a new match result
 */
async function logMatch(req: NextRequest) {
  const body = await req.json();
  
  // Validate input using schema
  const validatedData = validateOrThrow<LogMatchRequest>(body, commonSchemas.logMatch);

  const supabase = getAdminSupabaseClient();

  // Insert new match
  const { data, error } = await supabase
    .from('matches')
    .insert([{
      round_id: validatedData.round_id,
      stock_symbol: validatedData.stock_symbol,
      user_selection: validatedData.user_selection,
      correct: validatedData.correct
    }])
    .select()
    .single();

  if (error) {
    throw new AppError(
      `Failed to log match: ${error.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: error },
      'Failed to log match result. Please try again.'
    );
  }

  return createSuccessResponse<Match>(data);
}

/**
 * Get matches for a round
 */
async function getMatches(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roundId = searchParams.get('roundId');

  if (!roundId) {
    throw new AppError(
      'Round ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Round ID parameter is required.'
    );
  }

  const supabase = getAdminSupabaseClient();

  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('round_id', roundId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(
      `Failed to fetch matches: ${error.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: error },
      'Failed to fetch matches. Please try again.'
    );
  }

  return createSuccessResponse<Match[]>(matches || []);
}

// Export handlers with middleware
export const POST = composeMiddleware(
  withMethodValidation(['POST']),
  withErrorHandling
)(logMatch);

export const GET = composeMiddleware(
  withMethodValidation(['GET']),
  withErrorHandling
)(getMatches); 