import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Logger } from "@/utils/logger";

// Server-side Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const logger = new Logger("api/getUserRounds");

// Define interfaces for type safety
interface Round {
  id: string;
  user_id: string;
  dataset_name: string;
  completed: boolean;
  created_at: string;
}

interface Match {
  id: string;
  round_id: string;
  stock_symbol: string;
  user_selection: number;
  correct: boolean;
}

/**
 * Retrieves all rounds for a given user
 * @param userId - The ID of the user to fetch rounds for
 * @returns An array of rounds, each with accuracy and match metrics
 */
async function getUserRounds(userId: string) {
  if (!userId) {
    logger.error("No user ID provided");
    return { rounds: [] };
  }

  logger.info(`Fetching rounds for user: ${userId}`);

  try {
    // First, get all rounds for this user
    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (roundsError) {
      logger.error(`Error fetching rounds: ${roundsError.message}`);
      return { rounds: [] };
    }

    if (!rounds || rounds.length === 0) {
      logger.info(`No rounds found for user: ${userId}`);
      return { rounds: [] };
    }

    logger.info(`Found ${rounds.length} rounds for user: ${userId}`);

    // Now, for each round, get the match data and calculate statistics
    const processedRounds = await Promise.all(
      rounds.map(async (round: Round) => {
        try {
          // Get match data for this round
          const { data: matches, error: matchesError } = await supabase
            .from("matches")
            .select("*")
            .eq("round_id", round.id);

          if (matchesError) {
            logger.error(`Error fetching matches for round ${round.id}: ${matchesError.message}`);
            return {
              ...round,
              accuracy: "0.00",
              correctMatches: 0,
              totalMatches: 0,
            };
          }

          // Calculate statistics
          const totalMatches = matches ? matches.length : 0;
          const correctMatches = matches
            ? matches.filter((match: Match) => match.correct).length
            : 0;
          const accuracy = totalMatches > 0
            ? ((correctMatches / totalMatches) * 100).toFixed(2)
            : "0.00";

          // Format date for display
          const created_at = new Date(round.created_at).toLocaleString();

          return {
            ...round,
            created_at,
            accuracy,
            correctMatches,
            totalMatches,
          };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Error processing round ${round.id}: ${errorMessage}`);
          return {
            ...round,
            accuracy: "0.00",
            correctMatches: 0,
            totalMatches: 0,
          };
        }
      })
    );

    logger.info(`Successfully processed ${processedRounds.length} rounds`);
    return { rounds: processedRounds };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Unexpected error: ${errorMessage}`);
    return { rounds: [] };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      logger.warn("No user ID provided in request");
      return NextResponse.json({ rounds: [] });
    }

    const result = await getUserRounds(userId);
    return NextResponse.json(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Error in GET request: ${errorMessage}`);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: errorMessage },
      { status: 500 }
    );
  }
} 