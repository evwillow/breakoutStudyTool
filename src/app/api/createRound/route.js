// /src/app/api/createRound/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const roundData = await req.json();
    console.log("Server: Creating round:", roundData);

    // Validate data
    if (!roundData.dataset_name || !roundData.user_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the round
    const { data, error } = await supabase
      .from("rounds")
      .insert([roundData])
      .select();

    if (error) {
      console.error("Server: Error creating round:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    console.error("Server: Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}