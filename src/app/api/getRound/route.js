// /src/app/api/getRound/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req) {
  // Check if supabase is configured properly.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase is not configured properly." },
      { status: 500 }
    );
  }

  try {
    const url = new URL(req.url);
    const roundId = url.searchParams.get("id");
    
    if (!roundId) {
      return NextResponse.json(
        { error: "Round ID is required" },
        { status: 400 }
      );
    }

    // Get round data
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("*")
      .eq("id", roundId)
      .single();

    if (roundError) {
      console.error("Server: Error fetching round:", roundError);
      return NextResponse.json(
        { error: roundError.message }, 
        { status: roundError.code === "PGRST116" ? 404 : 500 }
      );
    }

    if (!round) {
      console.error("Server: Round not found:", roundId);
      return NextResponse.json(
        { error: "Round not found" }, 
        { status: 404 }
      );
    }

    // Get matches for this round
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (matchesError) {
      console.error("Server: Error fetching matches:", matchesError);
      return NextResponse.json({ error: matchesError.message }, { status: 500 });
    }

    // Calculate stats directly from matches
    const totalMatches = matches ? matches.length : 0;
    const correctMatches = matches ? matches.filter(match => match.correct).length : 0;
    const accuracy = totalMatches > 0 ? (correctMatches / totalMatches) * 100 : 0;

    const calculatedStats = {
      round_id: roundId,
      accuracy: accuracy.toFixed(2),
      total_matches: totalMatches,
      correct_matches: correctMatches
    };

    console.log("Server: Calculated stats for round", roundId, calculatedStats);

    // Return combined data
    return NextResponse.json({
      round,
      matches: matches || [],
      stats: calculatedStats
    });
  } catch (err) {
    console.error("Server: Unexpected error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}