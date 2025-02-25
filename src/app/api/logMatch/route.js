import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const matchData = req.body;

  try {
    // Get all matches for this round
    const { data: matches } = await supabase
      .from("matches")
      .select("correct")
      .eq("round_id", matchData.round_id);

    if (matches && matches.length > 0) {
      const totalMatches = matches.length;
      const correctMatches = matches.filter((m) => m.correct).length;
      const accuracy = totalMatches > 0 ? (correctMatches / totalMatches) * 100 : 0;

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
      }

      if (existingStat) {
        // Update existing stat
        const { error: updateError } = await supabase
          .from("stats")
          .update({ accuracy: accuracy })
          .eq("id", existingStat.id);

        if (updateError) {
          console.error("Server: Error updating stats:", updateError);
        } else {
          console.log("Server: Stats updated successfully");
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
        } else {
          console.log("Server: Stats inserted successfully");
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (statsError) {
    console.error("Server: Error updating stats:", statsError);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
