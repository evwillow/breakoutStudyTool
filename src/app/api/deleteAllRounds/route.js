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
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("API: Deleting all rounds for user:", userId);

    // First, get all rounds for this user
    const { data: userRounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id')
      .eq('user_id', userId);
      
    if (roundsError) {
      console.error("API: Error fetching user rounds:", roundsError);
      return NextResponse.json({ error: roundsError.message }, { status: 500 });
    }
    
    if (!userRounds || userRounds.length === 0) {
      return NextResponse.json({ message: "No rounds found to delete" });
    }
    
    const roundIds = userRounds.map(round => round.id);
    console.log(`API: Found ${roundIds.length} rounds to delete`);
    
    // Delete all matches for these rounds
    const { error: matchesDeleteError } = await supabase
      .from('matches')
      .delete()
      .in('round_id', roundIds);
      
    if (matchesDeleteError) {
      console.error("API: Error deleting matches:", matchesDeleteError);
      return NextResponse.json({ error: matchesDeleteError.message }, { status: 500 });
    }
    
    // Delete all rounds for this user
    const { error: roundsDeleteError } = await supabase
      .from('rounds')
      .delete()
      .eq('user_id', userId);
      
    if (roundsDeleteError) {
      console.error("API: Error deleting rounds:", roundsDeleteError);
      return NextResponse.json({ error: roundsDeleteError.message }, { status: 500 });
    }
    
    console.log(`API: Successfully deleted ${roundIds.length} rounds and their matches`);
    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${roundIds.length} rounds` 
    });
  } catch (err) {
    console.error("API: Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
} 