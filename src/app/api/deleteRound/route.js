// /src/app/api/deleteRound/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function DELETE(req) {
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

    console.log("Server: Deleting round:", roundId);
    
    // Delete all matches associated with this round first
    const { error: matchesError } = await supabase
      .from("matches")
      .delete()
      .eq("round_id", roundId);
    
    if (matchesError) {
      console.error("Server: Error deleting matches:", matchesError);
      return NextResponse.json(
        { error: "Failed to delete matches", details: matchesError.message },
        { status: 500 }
      );
    }
    
    // Now delete the round itself
    const { error: roundError } = await supabase
      .from("rounds")
      .delete()
      .eq("id", roundId);
    
    if (roundError) {
      console.error("Server: Error deleting round:", roundError);
      return NextResponse.json(
        { error: "Failed to delete round", details: roundError.message },
        { status: 500 }
      );
    }
    
    console.log("Server: Round deleted successfully:", roundId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Server: Unexpected error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}