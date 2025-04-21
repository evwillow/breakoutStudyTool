// /src/app/api/createRound/route.js
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
      { error: "Supabase is not configured properly" },
      { status: 500 }
    );
  }

  try {
    const { dataset_name, user_id, completed = false } = await req.json();

    // Validate required fields
    if (!dataset_name) {
      return NextResponse.json(
        { error: "Dataset name is required" },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Insert new round into Supabase
    const { data, error } = await supabase
      .from("rounds")
      .insert([
        { dataset_name, user_id, completed }
      ])
      .select();

    if (error) {
      console.error("Server: Error creating round:", error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Failed to create round - no data returned" },
        { status: 500 }
      );
    }

    console.log("Server: Round created successfully:", data[0]);
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    console.error("Server: Unexpected error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}