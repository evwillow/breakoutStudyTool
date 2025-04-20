/**
 * Supabase Client for Server-Side Operations
 * 
 * Initializes and exports a Supabase client configured for server-side use.
 * This client is used for secure operations that should only happen on the server:
 * - User authentication and management
 * - Protected data access and modification
 * - Database operations requiring admin privileges
 */
import { createClient } from "@supabase/supabase-js";

// Log environment variable status (without revealing secrets)
console.log("Supabase URL configured:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("Supabase Anon Key configured:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Validate that required environment variables are present
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Create and export a Supabase client for server-side use
 * This singleton instance is reused across different parts of the application
 * to maintain connection efficiency and consistent state
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default supabase; 