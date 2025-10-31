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
import { AppError, ErrorCodes } from '@/lib/utils/errorHandling';

/**
 * Log a new match result
 */
async function logMatch(req: NextRequest) {
  console.log('=== MATCH API ENDPOINT CALLED ===');
  
  let body;
  try {
    body = await req.json();
    console.log('Request body received:', body);
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

  console.log('Attempting to validate request data...');
  
  // Validate input using schema
  let validatedData;
  try {
    validatedData = validateOrThrow<LogMatchRequest>(body, commonSchemas.logMatch);
    console.log('Validation successful:', validatedData);
  } catch (validationError) {
    console.error('Validation failed:', validationError);
    throw validationError; // Re-throw validation errors as-is
  }

  console.log('Getting Supabase client...');
  const supabase = getAdminSupabaseClient();

  console.log('Attempting to insert match record:', {
    round_id: validatedData.round_id,
    stock_symbol: validatedData.stock_symbol,
    user_selection: validatedData.user_selection,
    correct: validatedData.correct
  });

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

  console.log('Supabase insert result:', { data, error });

  if (error) {
    console.error('Supabase error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    
    throw new AppError(
      `Failed to log match: ${error.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { 
        supabaseError: error,
        inputData: validatedData,
        errorDetails: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        }
      },
      'Failed to log match result. Please try again.'
    );
  }

  console.log('Match logged successfully:', data);
  console.log('=== MATCH API ENDPOINT COMPLETED ===');

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