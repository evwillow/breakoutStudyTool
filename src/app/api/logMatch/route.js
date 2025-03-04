import { createClient } from "@supabase/supabase-js";

// Use the correct environment variables for Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  // Check if supabase is configured properly.
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase is not configured properly." }), { status: 500 });
  }

  try {
    const matchData = await req.json();
    
    // Validate required fields
    if (!matchData.round_id) {
      console.error("Server: Missing round_id in match data");
      return new Response(JSON.stringify({ error: "round_id is required" }), { status: 400 });
    }
    
    // First, verify that the round exists in the database
    console.log("Server: Verifying round exists:", matchData.round_id);
    const { data: roundData, error: roundError } = await supabase
      .from("rounds")
      .select("id")
      .eq("id", matchData.round_id)
      .single();
      
    if (roundError || !roundData) {
      console.error("Server: Round not found:", matchData.round_id, roundError);
      return new Response(JSON.stringify({ 
        error: "Round not found", 
        details: "The specified round_id does not exist in the database",
        roundId: matchData.round_id
      }), { status: 404 });
    }
    
    // Insert the match data into the database
    console.log("Server: Inserting match data:", matchData);
    const { data: insertData, error: insertMatchError } = await supabase
      .from("matches")
      .insert([
        {
          round_id: matchData.round_id,
          stock_symbol: matchData.stock_symbol || "N/A",
          user_selection: matchData.user_selection || "",
          correct: matchData.correct === true || matchData.correct === false ? matchData.correct : false,
          user_id: matchData.user_id || null
        }
      ])
      .select();
      
    if (insertMatchError) {
      console.error("Server: Error inserting match:", insertMatchError);
      return new Response(JSON.stringify({ error: "Failed to insert match data", details: insertMatchError.message }), { status: 500 });
    }

    console.log("Server: Match inserted successfully:", insertData);

    // Get all matches for this round
    const { data: matches, error: matchError } = await supabase
      .from("matches")
      .select("correct")
      .eq("round_id", matchData.round_id);

    if (matchError) {
      console.error("Error fetching matches:", matchError);
      return new Response(JSON.stringify({ success: true, warning: "Match logged but could not fetch matches for stats" }), { status: 200 });
    }

    if (matches && matches.length > 0) {
      const totalMatches = matches.length;
      const correctMatches = matches.filter((m) => m.correct).length;
      const accuracy =
        totalMatches > 0 ? (correctMatches / totalMatches) * 100 : 0;

      console.log("Server: Accuracy calculation:", {
        totalMatches,
        correctMatches,
        accuracy: accuracy.toFixed(2) + "%",
      });

      // Skip stats update - just return success
      return new Response(JSON.stringify({ 
        success: true, 
        stats: {
          totalMatches,
          correctMatches,
          accuracy: accuracy.toFixed(2)
        }
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (statsError) {
    console.error("Server: Error processing match:", statsError);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: statsError.message }), { status: 500 });
  }
}
