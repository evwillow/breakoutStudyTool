/**
 * Test API endpoint
 * 
 * Simple endpoint to test database connectivity and environment setup
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient, validateDatabaseSchema } from '../_shared/clients/supabase';

export async function GET(req: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    console.log('Environment variables check:', envCheck);

    // Test database connection
    const supabase = getAdminSupabaseClient();
    
    // Test connection with a simple query
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    console.log('Database connection test result:', { testData, testError });

    // Validate schema
    const schemaResult = await validateDatabaseSchema();
    console.log('Schema validation result:', schemaResult);

    // Test matches table specifically
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .limit(1);

    console.log('Matches table test:', { matchesData, matchesError });

    // Test rounds table specifically  
    const { data: roundsData, error: roundsError } = await supabase
      .from('rounds')
      .select('*')
      .limit(1);

    console.log('Rounds table test:', { roundsData, roundsError });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      databaseConnection: {
        connected: !testError,
        error: testError?.message,
        testData: testData
      },
      schema: schemaResult,
      tables: {
        matches: {
          accessible: !matchesError,
          error: matchesError?.message,
          sampleCount: matchesData?.length || 0
        },
        rounds: {
          accessible: !roundsError,
          error: roundsError?.message,
          sampleCount: roundsData?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 