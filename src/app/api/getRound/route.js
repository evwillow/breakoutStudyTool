// /src/app/api/getRound/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req) {
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
      return NextResponse.json({ error: roundError.message }, { status: 500 });
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

    // Get stats for this round
    const { data: stats, error: statsError } = await supabase
      .from("stats")
      .select("*")
      .eq("round_id", roundId)
      .single();

    // Return combined data
    return NextResponse.json({
      round,
      matches: matches || [],
      stats: stats || null
    });
  } catch (err) {
    console.error("Server: Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}