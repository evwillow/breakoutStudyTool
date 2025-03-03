import { createClient } from "@supabase/supabase-js";

// Use SUPABASE_KEY if available, otherwise fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing. SUPABASE_URL and SUPABASE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  // Check if supabase is configured properly.
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase is not configured properly." }), { status: 500 });
  }

  try {
    const matchData = await req.json();
    
    // Insert the match data into the database
    console.log("Server: Inserting match data:", matchData);
    const { error: insertMatchError } = await supabase
      .from("matches")
      .insert([
        {
          round_id: matchData.round_id,
          stock_symbol: matchData.stock_symbol,
          user_selection: matchData.user_selection,
          correct: matchData.correct,
          user_id: matchData.user_id
        }
      ]);
      
    if (insertMatchError) {
      console.error("Server: Error inserting match:", insertMatchError);
      return new Response(JSON.stringify({ error: "Failed to insert match data" }), { status: 500 });
    }

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
