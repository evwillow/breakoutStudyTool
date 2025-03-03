// /src/app/api/getUserRounds/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
      return NextResponse.json({ error: roundsError.message }, { status: 500 });
    }
    
    if (!userRounds || userRounds.length === 0) {
      return NextResponse.json({ rounds: [] });
    }
    
    console.log(`API: Found ${userRounds.length} rounds`);
    
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
        created_at: new Date(round.created_at).toLocaleString()
      };
    }));
    
    console.log("API: Returning rounds with stats:", roundsWithStats);
    return NextResponse.json({ rounds: roundsWithStats });
  } catch (err) {
    console.error("API: Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}