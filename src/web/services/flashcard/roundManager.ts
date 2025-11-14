import { NextRequest } from 'next/server';
import { getAdminSupabaseClient, testDatabaseConnection, validateDatabaseSchema } from '@/app/api/_shared/clients/supabase';
import { validateOrThrow, commonSchemas } from '@/app/api/_shared/utils/validation';
import type { CreateRoundRequest, Round, LogMatchRequest, Match, HealthCheckResponse, ServiceStatus } from '@breakout-study-tool/shared';
import { AppError, ErrorCodes, ValidationError } from '@/lib/utils/errorHandling';
import { SCORING_CONFIG } from '@/config/game.config';

interface CreateRoundResult extends Round {}

export async function createRound(req: NextRequest): Promise<CreateRoundResult> {
  let body: unknown;
  try {
    body = await req.json();
  } catch (parseError) {
    throw new AppError(
      'Invalid JSON in request body',
      ErrorCodes.VALIDATION_ERROR,
      400,
      { parseError: parseError instanceof Error ? parseError.message : String(parseError) },
      'Invalid request format. Please check your data and try again.'
    );
  }

  const validatedData = validateOrThrow<CreateRoundRequest>(body, commonSchemas.createRound);

  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from('rounds')
    .insert([
      {
        dataset_name: validatedData.dataset_name,
        user_id: validatedData.user_id,
        name: validatedData.name || null,
        completed: validatedData.completed || false,
      },
    ])
    .select()
    .single();

  if (error) {
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
          code: error.code,
        },
      },
      'Failed to create game round. Please try again.'
    );
  }

  return data as Round;
}

export interface GetRoundsParams {
  req: NextRequest;
}

export async function getUserRounds({ req }: GetRoundsParams): Promise<Round[]> {
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

  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  if (Number.isNaN(limit) || limit < 1 || limit > 100) {
    throw new ValidationError(
      'Limit must be a number between 1 and 100',
      ErrorCodes.VALIDATION_ERROR,
      400,
      {},
      'Invalid limit parameter.'
    );
  }

  const supabase = getAdminSupabaseClient();

  // Optimized: Only select needed columns and fetch rounds first
  let roundsQuery = supabase
    .from('rounds')
    .select('id, user_id, name, dataset_name, completed, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (datasetName) {
    roundsQuery = roundsQuery.eq('dataset_name', datasetName);
  }

  // Start both queries in parallel for maximum speed
  const roundsPromise = roundsQuery;
  
  // Execute rounds query first to get IDs, then fetch matches in parallel
  const { data: rounds, error: roundsError } = await roundsPromise;

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
    return [];
  }

  // Optimized: Fetch matches in parallel, only selecting needed columns
  const roundIds = rounds.map(round => round.id);
  const { data: allMatches, error: matchesError } = await supabase
    .from('matches')
    .select('round_id, correct')
    .in('round_id', roundIds);

  // If matches query fails, return rounds with zero stats (non-blocking)
  if (matchesError) {
    return rounds.map(round => ({
      ...round,
      accuracy: '0.00',
      correctMatches: 0,
      totalMatches: 0,
    }));
  }

  // Build matches map efficiently
  const matchesByRoundId = new Map<string, Array<{ correct: boolean }>>();
  if (allMatches) {
    for (const match of allMatches) {
      const roundId = match.round_id;
      if (!matchesByRoundId.has(roundId)) {
        matchesByRoundId.set(roundId, []);
      }
      matchesByRoundId.get(roundId)!.push({ correct: match.correct });
    }
  }

  // Process rounds with matches data
  return rounds.map(round => {
    const matches = matchesByRoundId.get(round.id) || [];
    const totalMatches = matches.length;
    const correctMatches = matches.filter(match => match.correct === true).length;
    const accuracy =
      totalMatches > 0 ? ((correctMatches / totalMatches) * 100).toFixed(2) : '0.00';

    return {
      ...round,
      accuracy,
      correctMatches,
      totalMatches,
    };
  });
}

export async function logMatch(req: NextRequest): Promise<Match> {
  let body: unknown;
  try {
    body = await req.json();
  } catch (parseError) {
    throw new AppError(
      'Invalid JSON in request body',
      ErrorCodes.VALIDATION_ERROR,
      400,
      { parseError: parseError instanceof Error ? parseError.message : String(parseError) },
      'Invalid request format. Please check your data and try again.'
    );
  }

  const validatedData = validateOrThrow<LogMatchRequest>(body, commonSchemas.logMatch);

  const supabase = getAdminSupabaseClient();

  const insertData: Record<string, unknown> = {
    round_id: validatedData.round_id,
    stock_symbol: validatedData.stock_symbol,
  };

  if (validatedData.user_selection !== undefined) {
    insertData.user_selection = validatedData.user_selection;
  } else if (
    validatedData.user_selection_x !== undefined ||
    validatedData.user_selection_y !== undefined
  ) {
    insertData.user_selection = 0;
  }

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
  }
  if (validatedData.price_accuracy !== undefined) {
    insertData.price_accuracy = validatedData.price_accuracy;
  }
  if (validatedData.correct !== undefined) {
    insertData.correct = validatedData.correct;
  } else {
    const primaryAccuracy = validatedData.price_accuracy ?? validatedData.score;
    if (primaryAccuracy !== undefined) {
      insertData.correct = primaryAccuracy >= SCORING_CONFIG.CORRECT_THRESHOLD;
    }
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
          code: error.code,
        },
      },
      'Failed to log match result. Please try again.'
    );
  }

  return data as Match;
}

export async function getMatches(req: NextRequest): Promise<Match[]> {
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

  return matches || [];
}

export async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    const connectionTest = await testDatabaseConnection();
    const schemaTest = await validateDatabaseSchema();
    const responseTime = Date.now() - startTime;

    if (!connectionTest.success) {
      return {
        status: 'down',
        responseTime,
        error: connectionTest.error,
        lastChecked: new Date().toISOString(),
      };
    }

    if (!schemaTest.success) {
      return {
        status: 'degraded',
        responseTime,
        error: `Missing tables: ${schemaTest.missingTables?.join(', ')}`,
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      status: 'up',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function checkLocalDataHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    const fs = require('fs');
    const path = require('path');
    const dataPath = process.env.DATA_DIRECTORY
      ? path.join(process.env.DATA_DIRECTORY, 'quality_breakouts')
      : path.join(process.cwd(), 'data', 'quality_breakouts');

    const legacyPath = path.join(
      process.cwd(),
      '..',
      '..',
      'src',
      'data-processing',
      'ds',
      'quality_breakouts'
    );
    const finalPath = fs.existsSync(dataPath) ? dataPath : (fs.existsSync(legacyPath) ? legacyPath : dataPath);

    if (!fs.existsSync(finalPath)) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: 'Local data directory not found',
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function checkAuthHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    const requiredAuthVars = ['NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
    const missingVars = requiredAuthVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: `Missing auth environment variables: ${missingVars.join(', ')}`,
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function healthCheck(req: NextRequest): Promise<HealthCheckResponse> {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError(
      'Health check endpoint not available in production',
      ErrorCodes.AUTH_UNAUTHORIZED,
      403,
      {},
      'Access denied.'
    );
  }

  const [databaseStatus, localDataStatus, authStatus] = await Promise.all([
    checkDatabaseHealth(),
    checkLocalDataHealth(),
    checkAuthHealth(),
  ]);

  const services = { database: databaseStatus, localData: localDataStatus, auth: authStatus };
  const allServicesUp = Object.values(services).every(service => service.status === 'up');
  const anyServiceDown = Object.values(services).some(service => service.status === 'down');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (allServicesUp) {
    overallStatus = 'healthy';
  } else if (anyServiceDown) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
    environment: process.env.NODE_ENV || 'unknown',
  };
}

export async function getRoundById(roundId: string): Promise<Round> {
  if (!roundId) {
    throw new ValidationError(
      'Round ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Round ID parameter is required.'
    );
  }

  const supabase = getAdminSupabaseClient();
  const { data: round, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new AppError(
        'Round not found',
        ErrorCodes.DB_RECORD_NOT_FOUND,
        404,
        {},
        'The requested round was not found.'
      );
    }
    throw new AppError(
      `Failed to fetch round: ${error.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: error },
      'Failed to fetch round. Please try again.'
    );
  }

  return round as Round;
}

export async function updateRoundById(roundId: string, body: Record<string, unknown>): Promise<Round> {
  if (!roundId) {
    throw new ValidationError(
      'Round ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Round ID parameter is required.'
    );
  }

  const allowedFields = ['completed', 'dataset_name'];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new ValidationError(
      'No valid fields to update',
      ErrorCodes.VALIDATION_ERROR,
      400,
      {},
      'Please provide valid fields to update.'
    );
  }

  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from('rounds')
    .update(updateData)
    .eq('id', roundId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new AppError(
        'Round not found',
        ErrorCodes.DB_RECORD_NOT_FOUND,
        404,
        { roundId, updateData },
        'The requested round was not found.'
      );
    }
    throw new AppError(
      `Failed to update round: ${error.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      {
        supabaseError: error,
        roundId,
        updateData,
        errorDetails: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      'Failed to update round. Please try again.'
    );
  }

  return data as Round;
}

export async function deleteRoundById(roundId: string): Promise<void> {
  if (!roundId) {
    throw new ValidationError(
      'Round ID is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Round ID parameter is required.'
    );
  }

  const supabase = getAdminSupabaseClient();

  const { error: matchesError } = await supabase
    .from('matches')
    .delete()
    .eq('round_id', roundId);

  if (matchesError) {
    throw new AppError(
      `Failed to delete round matches: ${matchesError.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: matchesError },
      'Failed to delete round. Please try again.'
    );
  }

  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', roundId);

  if (error) {
    throw new AppError(
      `Failed to delete round: ${error.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: error },
      'Failed to delete round. Please try again.'
    );
  }
}

export interface DeleteRoundsResult {
  deletedRounds: number;
}

export async function deleteAllRoundsForUser(userId: string): Promise<DeleteRoundsResult> {
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
    return { deletedRounds: 0 };
  }

  const roundIds = rounds.map(round => round.id);

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

  return { deletedRounds: rounds.length };
}

