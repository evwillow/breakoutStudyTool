/**
 * Centralized Supabase Client Factory
 * 
 * Provides singleton instances of Supabase clients for different use cases:
 * - Admin client for server-side operations with elevated privileges
 * - Standard client for regular operations
 * - Cached instances to improve performance
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

// Validate environment variables at module load
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!serviceRoleKey && !anonKey) {
  throw new Error("Missing Supabase keys: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY required");
}

// Singleton instances
let adminClient: SupabaseClient | null = null;
let standardClient: SupabaseClient | null = null;

/**
 * Get admin Supabase client with service role key
 * Use for server-side operations requiring elevated privileges
 */
export function getAdminSupabaseClient(): SupabaseClient {
  if (!adminClient) {
    if (!serviceRoleKey) {
      throw new Error("Service role key required for admin client");
    }
    
    adminClient = createClient(supabaseUrl!, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    logger.info("Admin Supabase client initialized");
  }
  
  return adminClient;
}

/**
 * Get standard Supabase client with anon key
 * Use for operations that respect RLS policies
 */
export function getSupabaseClient(): SupabaseClient {
  if (!standardClient) {
    const key = serviceRoleKey || anonKey;
    if (!key) {
      throw new Error("No Supabase key available");
    }
    
    standardClient = createClient(supabaseUrl!, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    logger.info("Standard Supabase client initialized");
  }
  
  return standardClient;
}

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    const client = getSupabaseClient();
    
    // Simple connectivity test
    const { data, error } = await client
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      details: err
    };
  }
}

/**
 * Check if required tables exist
 */
export async function validateDatabaseSchema(): Promise<{
  success: boolean;
  missingTables?: string[];
  error?: string;
}> {
  try {
    const client = getAdminSupabaseClient();
    const requiredTables = ['users', 'rounds', 'matches'];
    const missingTables: string[] = [];
    
    for (const table of requiredTables) {
      const { error } = await client
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        missingTables.push(table);
      }
    }
    
    return {
      success: missingTables.length === 0,
      missingTables: missingTables.length > 0 ? missingTables : undefined
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
} 