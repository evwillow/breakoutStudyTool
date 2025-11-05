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
  
  // Validate input using schema
  let validatedData;
  try {
    validatedData = validateOrThrow<LogMatchRequest>(body, commonSchemas.logMatch);
  } catch (validationError) {
    console.error('Validation failed:', validationError);
    throw validationError; // Re-throw validation errors as-is
  }

  const supabase = getAdminSupabaseClient();

  // Insert new match (support both old and new formats)
  const insertData: any = {
    round_id: validatedData.round_id,
    stock_symbol: validatedData.stock_symbol,
  };
  
  // Add legacy button-based fields if provided
  if (validatedData.user_selection !== undefined) {
    insertData.user_selection = validatedData.user_selection;
  }
  if (validatedData.correct !== undefined) {
    insertData.correct = validatedData.correct;
  }
  
  // Add new coordinate-based fields if provided
  if (validatedData.user_selection_x !== undefined) {
    insertData.user_selection_x = validatedData.user_selection_x;
  }
  if (validatedData.user_selection_y !== undefined) {
    insertData.user_selection_y = validatedData.user_selection_y;
  }
  if (validatedData.target_x !== undefined) {
    insertData.target_x = validatedData.target_x;
  }
  if (validatedData.target_y !== undefined) {
    insertData.target_y = validatedData.target_y;
  }
  if (validatedData.distance !== undefined) {
    insertData.distance = validatedData.distance;
  }
  if (validatedData.score !== undefined) {
    insertData.score = validatedData.score;
    // Auto-calculate correct from price accuracy or score if not provided
    if (validatedData.correct === undefined) {
      // Use price_accuracy if available (primary metric), otherwise use score
      const primaryAccuracy = validatedData.price_accuracy ?? validatedData.score;
      insertData.correct = primaryAccuracy >= 70;
    }
  }
  
  // Add price-focused accuracy fields (primary metric for stock trading)
  if (validatedData.price_accuracy !== undefined) {
    insertData.price_accuracy = validatedData.price_accuracy;
  }
  if (validatedData.time_position !== undefined) {
    insertData.time_position = validatedData.time_position;
  }
  if (validatedData.price_error !== undefined) {
    insertData.price_error = validatedData.price_error;
  }
  if (validatedData.time_error !== undefined) {
    insertData.time_error = validatedData.time_error;
  }

  const { data, error } = await supabase
    .from('matches')
    .insert([insertData])
    .select()
    .single();

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