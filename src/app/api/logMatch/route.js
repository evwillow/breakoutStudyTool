import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function POST(req) {
  try {
    const matchData = await req.json();

    // Get all matches for this round
    const { data: matches, error: matchError } = await supabase
      .from("matches")
      .select("correct")
      .eq("round_id", matchData.round_id);

    if (matchError) throw matchError;

    if (matches && matches.length > 0) {
      const totalMatches = matches.length;
      const correctMatches = matches.filter((m) => m.correct).length;
      const accuracy = (correctMatches / totalMatches) * 100;

      console.log("Updating stats for round:", matchData.round_id);
      console.log("Accuracy calculation:", {
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

      if (statCheckError) throw statCheckError;

      if (existingStat) {
        // Update existing stat
        const { error: updateError } = await supabase
          .from("stats")
          .update({ accuracy })
          .eq("id", existingStat.id);

        if (updateError) throw updateError;
      } else {
        // Insert new stat
        const { error: insertError } = await supabase
          .from("stats")
          .insert([{ round_id: matchData.round_id, accuracy }]);

        if (insertError) throw insertError;
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error updating stats:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
