/**
 * @deprecated This file is deprecated. Use src/lib/supabase.js instead.
 * 
 * Legacy Supabase Client Configuration
 * 
 * This file now redirects to the optimized client factory in src/lib/supabase.js
 * for better performance, error handling, and maintainability.
 * 
 * Migration Guide:
 * - Replace: import supabase from "./config/supabase"
 * - With: import { getClientSupabaseClient } from "@/lib/supabase"
 * - Or: const supabase = getClientSupabaseClient()
 */
import { getClientSupabaseClient } from "../lib/supabase.js";

// Log deprecation warning in development
if (process.env.NODE_ENV === 'development') {
  console.warn('⚠️  DEPRECATED: src/config/supabase.js is deprecated. Use src/lib/supabase.js instead.');
  console.warn('   Migration: import { getClientSupabaseClient } from "@/lib/supabase"');
}

// Export the client-side Supabase client for backward compatibility
// This ensures we always get the browser-safe client
const supabase = getClientSupabaseClient();

export default supabase;
