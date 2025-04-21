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
    const updateData = await req.json();
    console.log("Server: Updating round:", updateData);

    // Validate data
    if (!updateData.id) {
      return NextResponse.json(
        { error: "Round ID is required" },
        { status: 400 }
      );
    }

    // Create an update object with only the fields we want to update
    const updateObject = {};
    if (updateData.completed !== undefined) updateObject.completed = updateData.completed;
    if (updateData.dataset_name !== undefined) updateObject.dataset_name = updateData.dataset_name;

    // Update the round
    const { data, error } = await supabase
      .from("rounds")
      .update(updateObject)
      .eq("id", updateData.id)
      .select();

    if (error) {
      console.error("Server: Error updating round:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    console.log("Server: Round updated successfully:", data);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Server: Unexpected error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
} 