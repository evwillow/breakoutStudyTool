// /src/app/api/deleteRound/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const roundId = url.searchParams.get("id");
    
    if (!roundId) {
      return NextResponse.json(
        { error: "Round ID is required" },
        { status: 400 }
      );
    }

    // Delete the round
    const { error } = await supabase
      .from('rounds')
      .delete()
      .eq('id', roundId);
      
    if (error) {
      console.error("API: Error deleting round:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API: Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}