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
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("Server: Deleting all rounds for user:", userId);
    
    // First, get all rounds for this user
    const { data: rounds, error: fetchError } = await supabase
      .from("rounds")
      .select("id")
      .eq("user_id", userId);
    
    if (fetchError) {
      console.error("Server: Error fetching rounds:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch rounds", details: fetchError.message },
        { status: 500 }
      );
    }
    
    if (!rounds || rounds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No rounds found to delete" 
      });
    }
    
    const roundIds = rounds.map(round => round.id);
    console.log("Server: Found rounds to delete:", roundIds);
    
    // Delete all matches associated with these rounds
    const { error: matchesError } = await supabase
      .from("matches")
      .delete()
      .in("round_id", roundIds);
    
    if (matchesError) {
      console.error("Server: Error deleting matches:", matchesError);
      return NextResponse.json(
        { error: "Failed to delete matches", details: matchesError.message },
        { status: 500 }
      );
    }
    
    // Now delete the rounds
    const { error: roundsError } = await supabase
      .from("rounds")
      .delete()
      .eq("user_id", userId);
    
    if (roundsError) {
      console.error("Server: Error deleting rounds:", roundsError);
      return NextResponse.json(
        { error: "Failed to delete rounds", details: roundsError.message },
        { status: 500 }
      );
    }
    
    console.log("Server: Successfully deleted all rounds for user:", userId);
    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${roundIds.length} rounds` 
    });
  } catch (err) {
    console.error("Server: Unexpected error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
} 