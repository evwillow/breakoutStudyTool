/**
 * Individual Round Management API
 * 
 * Handles operations on specific rounds by ID
 */
import { NextRequest } from 'next/server';
import { getAdminSupabaseClient } from '../../../_shared/clients/supabase';
import { createSuccessResponse } from '../../../_shared/utils/response';
import { withErrorHandling, withMethodValidation, composeMiddleware } from '../../../_shared/middleware/errorHandler';
import { Round } from '../../../_shared/types/api';
import { AppError, ErrorCodes, ValidationError } from '@/utils/errorHandling';

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

  return createSuccessResponse<Round>(round);
}

/**
 * Update a specific round
 */
async function updateRound(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roundId } = await params;
  const body = await req.json();

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

  // Only allow updating specific fields
  const allowedFields = ['completed', 'dataset_name'];
  const updateData: any = {};
  
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
        {},
        'The requested round was not found.'
      );
    }
    throw new AppError(
      `Failed to update round: ${error.message}`,
      ErrorCodes.DB_QUERY_ERROR,
      500,
      { supabaseError: error },
      'Failed to update round. Please try again.'
    );
  }

  return createSuccessResponse<Round>(data);
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

  const supabase = getAdminSupabaseClient();

  // First delete associated matches
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

  // Then delete the round
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

  return createSuccessResponse({ message: 'Round deleted successfully' });
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