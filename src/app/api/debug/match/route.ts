/**
 * Debug Match API
 * 
 * Test endpoint for debugging match creation issues
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '../../_shared/clients/supabase';
import { validateOrThrow, commonSchemas } from '../../_shared/utils/validation';

export async function POST(req: NextRequest) {
  console.log('=== DEBUG MATCH API CALLED ===');
  
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Test validation
    console.log('Testing validation...');
    const validatedData = validateOrThrow(body, commonSchemas.logMatch);
    console.log('Validation successful:', validatedData);

    // Test database connection
    console.log('Testing database connection...');
    const supabase = getAdminSupabaseClient();

    // Check if the round exists
    console.log('Checking if round exists:', validatedData.round_id);
    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', validatedData.round_id)
      .single();

    console.log('Round check result:', { roundData, roundError });

    if (roundError) {
      return NextResponse.json({
        success: false,
        step: 'round_check',
        error: 'Round not found or database error',
        details: roundError,
        suggestion: 'Make sure the round ID exists in the database'
      }, { status: 400 });
    }

    // Test inserting the match
    console.log('Attempting to insert match...');
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert([{
        round_id: validatedData.round_id,
        stock_symbol: validatedData.stock_symbol,
        user_selection: validatedData.user_selection,
        correct: validatedData.correct
      }])
      .select()
      .single();

    console.log('Match insert result:', { matchData, matchError });

    if (matchError) {
      return NextResponse.json({
        success: false,
        step: 'match_insert',
        error: 'Failed to insert match',
        details: matchError,
        validatedData: validatedData,
        roundData: roundData
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Match created successfully',
      data: matchData,
      roundData: roundData,
      validatedData: validatedData
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      step: 'general_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  console.log('=== DEBUG MATCH GET CALLED ===');
  
  try {
    const supabase = getAdminSupabaseClient();
    
    // Get some sample data for testing
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select('*')
      .limit(5);

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .limit(5);

    return NextResponse.json({
      success: true,
      sampleRounds: rounds,
      sampleMatches: matches,
      errors: {
        rounds: roundsError,
        matches: matchesError
      },
      testData: {
        round_id: rounds?.[0]?.id || '00000000-0000-0000-0000-000000000000',
        stock_symbol: 'AAPL',
        user_selection: 1,
        correct: true
      }
    });

  } catch (error) {
    console.error('Debug GET endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 