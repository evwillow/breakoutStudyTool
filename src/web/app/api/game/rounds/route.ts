/**
 * Game Rounds API
 * 
 * Handles CRUD operations for game rounds
 */
import { NextRequest } from 'next/server';
import { getAdminSupabaseClient } from '../../_shared/clients/supabase';
import { createSuccessResponse } from '../../_shared/utils/response';
import { withErrorHandling, withMethodValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { validateOrThrow, commonSchemas } from '../../_shared/utils/validation';
import { CreateRoundRequest, Round } from '../../_shared/types/api';
import { AppError, ErrorCodes, ValidationError } from '@/lib/utils/errorHandling';

/**
 * Create a new game round
 */
async function createRound(req: NextRequest) {
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
    validatedData = validateOrThrow<CreateRoundRequest>(body, commonSchemas.createRound);
  } catch (validationError) {
    console.error('Validation failed:', validationError);
    throw validationError; // Re-throw validation errors as-is
  }

  const supabase = getAdminSupabaseClient();

  // Insert new round
  const { data, error } = await supabase
    .from('rounds')
    .insert([{
      dataset_name: validatedData.dataset_name,
      user_id: validatedData.user_id,
      name: validatedData.name || null,
      completed: validatedData.completed || false
    }])
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
      `Failed to create round: ${error.message}`,
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
      'Failed to create game round. Please try again.'
    );
  }

  return createSuccessResponse<Round>(data);
}

/**
 * Get rounds for a user
 */
async function getUserRounds(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const datasetName = searchParams.get('datasetName');
  const limitParam = searchParams.get('limit');

  if (!userId) {
    throw new ValidationError(
      'User ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'User ID parameter is required.'
    );
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 50; // Default limit of 50
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new ValidationError(
      'Limit must be a number between 1 and 100',
      ErrorCodes.VALIDATION_ERROR,
      400,
      {},
      'Invalid limit parameter.'
    );
  }

  const supabase = getAdminSupabaseClient();

  // Build query with optional dataset filter
  let query = supabase
    .from('rounds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Add dataset filter if provided
  if (datasetName) {
    query = query.eq('dataset_name', datasetName);
  }

  const { data: rounds, error: roundsError } = await query;

  if (roundsError) {
    throw new AppError(
      `Failed to fetch rounds: ${roundsError.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: roundsError },
      'Failed to fetch game rounds. Please try again.'
    );
  }

  if (!rounds || rounds.length === 0) {
    return createSuccessResponse<Round[]>([]);
  }

  // Optimize: Fetch all matches in a single query instead of per-round
  const roundIds = rounds.map(round => round.id);
  const { data: allMatches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .in('round_id', roundIds);

  if (matchesError) {
    console.error('Error fetching matches:', matchesError);
    // Return rounds without statistics if matches query fails
    return createSuccessResponse<Round[]>(
      rounds.map(round => ({
        ...round,
        accuracy: '0.00',
        correctMatches: 0,
        totalMatches: 0,
      }))
    );
  }

  // Group matches by round_id for O(1) lookup
  const matchesByRoundId = new Map<string, typeof allMatches>();
  if (allMatches) {
    for (const match of allMatches) {
      const roundId = match.round_id;
      if (!matchesByRoundId.has(roundId)) {
        matchesByRoundId.set(roundId, []);
      }
      matchesByRoundId.get(roundId)!.push(match);
    }
  }

  // Calculate statistics for each round using pre-fetched matches
  const processedRounds = rounds.map((round) => {
    const matches = matchesByRoundId.get(round.id) || [];
    const totalMatches = matches.length;
    // Explicitly check for correct === true to handle null/undefined cases
    const correctMatches = matches.filter((match) => match.correct === true).length;
    const accuracy = totalMatches > 0
      ? ((correctMatches / totalMatches) * 100).toFixed(2)
      : '0.00';

    return {
      ...round,
      accuracy,
      correctMatches,
      totalMatches,
    };
  });

  return createSuccessResponse<Round[]>(processedRounds);
}

// Export handlers with middleware
export const POST = composeMiddleware(
  withMethodValidation(['POST']),
  withErrorHandling
)(createRound);

export const GET = composeMiddleware(
  withMethodValidation(['GET']),
  withErrorHandling
)(getUserRounds); 