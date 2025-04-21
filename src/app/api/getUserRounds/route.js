// /src/app/api/getUserRounds/route.js
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { 
  withErrorHandling, 
  createSuccessResponse, 
  createErrorResponse 
} from '@/app/api/middleware';
import { 
  AppError, 
  ErrorCodes, 
  DatabaseError 
} from '@/utils/errorHandling';
import { Logger } from "@/utils/logger";

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Fallback to anon key if service role key is not available
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("API: Fetching rounds for user:", userId);

    // Get all rounds for this user
    const { data: userRounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, dataset_name, created_at, completed')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (roundsError) {
      console.error("API: Error fetching user rounds:", roundsError);
      
      // Return empty array instead of throwing an error
      return NextResponse.json({ 
        rounds: [],
        warning: "Failed to retrieve rounds data. Please try again later."
      });
    }
    
    if (!userRounds || userRounds.length === 0) {
      return NextResponse.json({ rounds: [] });
    }
    
    console.log(`API: Found ${userRounds.length} rounds for user`, userId);
    
    // For each round, get matches and calculate stats
    const roundsWithStats = await Promise.all(userRounds.map(async (round) => {
      // Get matches for this round
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('correct')
        .eq('round_id', round.id);
        
      if (matchesError) {
        console.error(`API: Error fetching matches for round ${round.id}:`, matchesError);
        return {
          ...round,
          accuracy: "0.00",
          totalMatches: 0,
          created_at: new Date(round.created_at).toLocaleString()
        };
      }
      
      // Calculate accuracy
      const totalMatches = matches ? matches.length : 0;
      const correctMatches = matches ? matches.filter(match => match.correct).length : 0;
      
      console.log(`API: Round ${round.id} - ${correctMatches} correct out of ${totalMatches} matches`);
      
      let accuracy = "0.00";
      if (totalMatches > 0) {
        const accuracyValue = (correctMatches / totalMatches) * 100;
        accuracy = accuracyValue.toFixed(2);
      }
        
      return {
        ...round,
        accuracy,
        totalMatches,
        correctMatches,
        created_at: new Date(round.created_at).toLocaleString()
      };
    }));
    
    console.log("API: Returning rounds with stats:", roundsWithStats);
    return NextResponse.json({ rounds: roundsWithStats });
  } catch (err) {
    console.error("API: Unexpected error:", err);
    return NextResponse.json({ 
      rounds: [],
      warning: "There was an error retrieving your rounds. Some data may be missing."
    });
  }
}