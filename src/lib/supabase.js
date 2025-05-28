/**
 * Optimized Supabase Client Factory
 * 
 * Provides singleton instances of Supabase clients for different use cases:
 * - Server-side client with service role key for admin operations
 * - Client-side client with anon key for user operations
 * - Proper error handling and environment validation
 * - Performance optimizations with connection caching
 * - Next.js 15 compatibility
 */
import { createClient } from "@supabase/supabase-js";

// Environment detection
const isServer = typeof window === 'undefined';
const isBrowser = typeof window !== 'undefined';

// Environment validation with detailed error messages
const validateEnvironment = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  // Different validation for server vs browser
  if (isServer) {
    // Server-side: require at least one key
    if (!serviceKey && !anonKey) {
      throw new Error("Missing Supabase keys: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY required");
    }
  } else {
    // Browser-side: only anon key is available
    if (!anonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for client-side operations");
    }
  }

  return { url, serviceKey, anonKey };
};

// Validate environment on module load
const { url: supabaseUrl, serviceKey, anonKey } = validateEnvironment();

// Singleton instances for performance
let serverClient = null;
let clientClient = null;

/**
 * Get server-side Supabase client with service role key
 * Use for admin operations, bypassing RLS policies
 * 
 * @returns {import('@supabase/supabase-js').SupabaseClient} Admin Supabase client
 */
export const getServerSupabaseClient = () => {
  // Prevent server client creation in browser
  if (isBrowser) {
    throw new Error("Server Supabase client cannot be used in browser environment. Use getClientSupabaseClient() instead.");
  }

  if (!serverClient) {
    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY required for server operations");
    }

    serverClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'breakout-study-tool-server'
        }
      }
    });

    // Add connection validation
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Server Supabase client initialized');
    }
  }

  return serverClient;
};

/**
 * Get client-side Supabase client with anon key
 * Use for user operations that respect RLS policies
 * 
 * @returns {import('@supabase/supabase-js').SupabaseClient} Client Supabase client
 */
export const getClientSupabaseClient = () => {
  if (!clientClient) {
    // In browser, only use anon key
    // On server, prefer anon key but fallback to service key
    const key = isBrowser ? anonKey : (anonKey || serviceKey);
    
    if (!key) {
      const envName = isBrowser ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY';
      throw new Error(`No Supabase key available for client operations. Missing: ${envName}`);
    }

    clientClient = createClient(supabaseUrl, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'breakout-study-tool-client'
        }
      }
    });

    // Add connection validation
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Client Supabase client initialized');
    }
  }

  return clientClient;
};

/**
 * Get the appropriate Supabase client based on environment
 * - Server: Returns server client with service role key
 * - Browser: Returns client with anon key
 * 
 * @returns {import('@supabase/supabase-js').SupabaseClient} Environment-appropriate Supabase client
 */
export const getSupabaseClient = () => {
  if (isServer) {
    return getServerSupabaseClient();
  } else {
    return getClientSupabaseClient();
  }
};

/**
 * Test database connectivity
 * 
 * @param {boolean} useServerClient - Whether to test with server client
 * @returns {Promise<{success: boolean, error?: string, latency?: number}>}
 */
export const testConnection = async (useServerClient = false) => {
  const startTime = Date.now();
  
  try {
    const client = useServerClient ? getServerSupabaseClient() : getClientSupabaseClient();
    
    // Simple connectivity test
    const { error } = await client
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    const latency = Date.now() - startTime;
    
    if (error) {
      return {
        success: false,
        error: error.message,
        latency
      };
    }
    
    return { 
      success: true, 
      latency 
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
};

/**
 * Reset client instances (useful for testing)
 */
export const resetClients = () => {
  serverClient = null;
  clientClient = null;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Supabase clients reset');
  }
};

// Default export for backward compatibility - environment-aware
// Server: Returns server client, Browser: Returns client client
const supabase = getSupabaseClient();
export default supabase; 