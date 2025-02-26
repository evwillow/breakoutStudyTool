import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// If the environment variables are missing, log an error and create a dummy client.
let supabase;
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing. SUPABASE_URL and SUPABASE_KEY must be set.");
  // Dummy client that returns errors when used.
  supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({ data: null, error: { message: "Supabase not configured" } })
      }),
      update: () => ({ error: { message: "Supabase not configured" } }),
      insert: () => ({ error: { message: "Supabase not configured" } })
    })
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export async function POST(req) {
  // Check if supabase is configured properly.
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase is not configured properly." }), { status: 500 });
  }

  try {
    const matchData = await req.json();

    // Get all matches for this round
    const { data: matches, error: matchError } = await supabase
      .from("matches")
      .select("correct")
      .eq("round_id", matchData.round_id);

    if (matchError) {
      console.error("Error fetching matches:", matchError);
      return new Response(JSON.stringify({ error: "Failed to fetch matches" }), { status: 500 });
    }

    if (matches && matches.length > 0) {
      const totalMatches = matches.length;
      const correctMatches = matches.filter((m) => m.correct).length;
      const accuracy =
        totalMatches > 0 ? (correctMatches / totalMatches) * 100 : 0;

      console.log("Server: Updating stats for round", matchData.round_id);
      console.log("Server: Accuracy calculation:", {
        totalMatches,
        correctMatches,
        accuracy: accuracy.toFixed(2) + "%",
      });

      // Check if stats entry exists
      const { data: existingStat, error: statCheckError } = await supabase
        .from("stats")
        .select("id")
        .eq("round_id", matchData.round_id)
        .maybeSingle();

      if (statCheckError && statCheckError.code !== "PGRST116") {
        console.error("Server: Error checking stats:", statCheckError);
        return new Response(JSON.stringify({ error: "Failed to check existing stats" }), { status: 500 });
      }

      if (existingStat) {
        // Update existing stat
        const { error: updateError } = await supabase
          .from("stats")
          .update({ accuracy: accuracy })
          .eq("id", existingStat.id);

        if (updateError) {
          console.error("Server: Error updating stats:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update stats" }), { status: 500 });
        }
      } else {
        // Insert new stat
        const { error: insertError } = await supabase
          .from("stats")
          .insert([
            {
              round_id: matchData.round_id,
              accuracy: accuracy,
            },
          ]);

        if (insertError) {
          console.error("Server: Error inserting stats:", insertError);
          return new Response(JSON.stringify({ error: "Failed to insert stats" }), { status: 500 });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (statsError) {
    console.error("Server: Error updating stats:", statsError);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
