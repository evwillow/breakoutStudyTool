import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  // Check if supabase is configured properly.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase is not configured properly." },
      { status: 500 }
    );
  }

  try {
    const matchData = await req.json();
    console.log("Server: Logging match:", matchData);

    // Validate required fields
    if (!matchData.round_id) {
      return NextResponse.json(
        { error: "Round ID is required" },
        { status: 400 }
      );
    }

    // Verify the round exists first
    const { data: roundData, error: roundError } = await supabase
      .from("rounds")
      .select("id")
      .eq("id", matchData.round_id)
      .single();

    if (roundError || !roundData) {
      console.error("Server: Round not found:", matchData.round_id);
      return NextResponse.json(
        { error: "Round not found" },
        { status: 404 }
      );
    }

    // Insert the match
    const { data, error } = await supabase
      .from("matches")
      .insert([
        {
          round_id: matchData.round_id,
          stock_symbol: matchData.stock_symbol || "N/A",
          user_selection: matchData.user_selection,
          correct: matchData.correct === true,
          user_id: matchData.user_id,
        }
      ])
      .select();

    if (error) {
      console.error("Server: Error logging match:", error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    // Calculate match statistics
    const { data: matches, error: statsError } = await supabase
      .from("matches")
      .select("correct")
      .eq("round_id", matchData.round_id);

    if (statsError) {
      console.error("Server: Error fetching match statistics:", statsError);
      return NextResponse.json({ 
        success: true, 
        data,
        warning: "Match logged successfully but failed to calculate statistics"
      });
    }

    const totalMatches = matches.length;
    const correctMatches = matches.filter(match => match.correct).length;
    const accuracy = totalMatches > 0 
      ? ((correctMatches / totalMatches) * 100).toFixed(2)
      : "0.00";

    console.log("Server: Match logged successfully with stats:", {
      totalMatches,
      correctMatches,
      accuracy
    });

    return NextResponse.json({
      success: true,
      data,
      stats: {
        totalMatches,
        correctMatches,
        accuracy
      }
    });
  } catch (err) {
    console.error("Server: Unexpected error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
