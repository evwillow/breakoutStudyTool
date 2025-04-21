/**
 * Supabase Client Configuration
 * 
 * Initializes and exports the Supabase client for database operations.
 * This client is used throughout the application for:
 * - User authentication
 * - Storing and retrieving round data
 * - Logging match results and statistics
 * - Managing user progress and history
 */
import { createClient } from "@supabase/supabase-js";

// Validate that required environment variables are present
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

// Initialize the Supabase client with environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default supabase;
