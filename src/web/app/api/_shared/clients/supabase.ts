/**
 * @fileoverview Creates Supabase client instances for server-side API routes.
 * @module src/web/app/api/_shared/clients/supabase.ts
 * @dependencies @supabase/supabase-js, @/lib/utils/logger
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from "@/lib/utils/logger";

// Lazy env resolution to avoid crashing at import time
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ensureEnv = () => {
  if (!supabaseUrl) {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  if (!serviceRoleKey) {
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (!anonKey) {
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  if (!supabaseUrl) {
    if (process.env.NODE_ENV !== 'production') {
      return false;
    }
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }
  return true;
};

// Singleton instances
let adminClient: SupabaseClient | null = null;
let standardClient: SupabaseClient | null = null;

/**
 * Get admin Supabase client with service role key
 * Use for server-side operations requiring elevated privileges
 */
export function getAdminSupabaseClient(): SupabaseClient {
  if (!adminClient) {
    if (!ensureEnv()) {
      // Dev-friendly proxy that throws when used
      return new Proxy({} as any, {
        get() { throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); }
      });
    }
    if (!serviceRoleKey) {
      if (process.env.NODE_ENV !== 'production') {
        return new Proxy({} as any, {
          get() { throw new Error('Service role key required for admin client'); }
        });
      }
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
    if (!ensureEnv()) {
      return new Proxy({} as any, {
        get() { throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'); }
      });
    }
    const key = serviceRoleKey || anonKey;
    if (!key) {
      if (process.env.NODE_ENV !== 'production') {
        return new Proxy({} as any, {
          get() { throw new Error('No Supabase key available'); }
        });
      }
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