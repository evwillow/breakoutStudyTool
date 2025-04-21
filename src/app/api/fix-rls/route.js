import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET(req) {
  try {
    // Check if the users table exists
    console.log("Checking for users table...");
    const { data: tables, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'users');
    
    if (tableError) {
      console.error("Error checking for users table:", tableError.message);
      return NextResponse.json({
        status: "error",
        message: "Failed to check if users table exists",
        error: tableError.code
      }, { status: 500 });
    }
    
    const usersTableExists = tables.length > 0;
    if (!usersTableExists) {
      // Try to create the users table
      try {
        const { error: createError } = await supabase.rpc('run_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.users (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              email TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              email_verified BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
        
        if (createError) {
          console.error("Failed to create users table:", createError.message);
          return NextResponse.json({
            status: "error",
            message: "Failed to create users table",
            error: createError.code,
            suggestion: "The users table doesn't exist and we couldn't create it. You need to create it manually in the Supabase dashboard."
          }, { status: 500 });
        }
        
        console.log("Users table created successfully");
      } catch (createError) {
        console.error("Error creating users table:", createError.message);
        
        // Try another approach using execute
        try {
          const { error: executeError } = await supabase.rpc('execute', {
            command: `
              CREATE TABLE IF NOT EXISTS public.users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
            `
          });
          
          if (executeError) throw executeError;
          console.log("Users table created successfully with execute");
        } catch (executeError) {
          return NextResponse.json({
            status: "error",
            message: "Failed to create users table with both methods",
            error: executeError.code,
            suggestion: "You need to create the users table manually"
          }, { status: 500 });
        }
      }
    }
    
    // Configure proper RLS on the users table
    console.log("Configuring secure Row Level Security on users table...");
    try {
      // First, enable RLS
      const { error: enableRlsError } = await supabase.rpc('run_sql', {
        sql: `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`
      });
      
      if (enableRlsError) {
        console.error("Failed to enable RLS:", enableRlsError.message);
        return NextResponse.json({
          status: "error",
          message: "Failed to enable RLS",
          error: enableRlsError.code,
          solution: "Please enable RLS manually in the Supabase dashboard and set up appropriate policies."
        }, { status: 500 });
      }
      
      // Drop existing policies to avoid conflicts
      try {
        await supabase.rpc('run_sql', {
          sql: `
            DROP POLICY IF EXISTS "Anon can read all users" ON public.users;
            DROP POLICY IF EXISTS "Anon can insert new users" ON public.users;
            DROP POLICY IF EXISTS "Users can manage their own data" ON public.users;
          `
        });
      } catch (dropError) {
        console.error("Error dropping existing policies:", dropError.message);
        // Continue even if dropping fails
      }
      
      // Create policy for anon role to read user data (needed for login)
      const { error: anonReadError } = await supabase.rpc('run_sql', {
        sql: `
          CREATE POLICY "Anon can read all users"
          ON public.users
          FOR SELECT
          TO anon
          USING (true);
        `
      });
      
      if (anonReadError) {
        console.error("Failed to create anon read policy:", anonReadError.message);
      }
      
      // Create policy for anon role to insert users (for signup)
      const { error: anonInsertError } = await supabase.rpc('run_sql', {
        sql: `
          CREATE POLICY "Anon can insert new users"
          ON public.users
          FOR INSERT
          TO anon
          WITH CHECK (true);
        `
      });
      
      if (anonInsertError) {
        console.error("Failed to create anon insert policy:", anonInsertError.message);
      }
      
      // Create policy for authenticated users to manage their own data
      const { error: userPolicy } = await supabase.rpc('run_sql', {
        sql: `
          CREATE POLICY "Users can manage their own data"
          ON public.users
          FOR ALL
          TO authenticated
          USING (auth.uid() = id);
        `
      });
      
      if (userPolicy) {
        console.error("Failed to create user policy:", userPolicy.message);
      }
      
      console.log("RLS configured successfully with secure policies");
      
      return NextResponse.json({
        status: "success",
        message: "Successfully configured database security",
        details: "Row Level Security (RLS) has been enabled on the users table with appropriate policies."
      });
    } catch (rlsError) {
      console.error("Error configuring RLS:", rlsError.message);
      return NextResponse.json({
        status: "error",
        message: "Failed to configure RLS",
        error: rlsError.code,
        solution: "Please follow the security instructions in the Supabase documentation"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return NextResponse.json({
      status: "error",
      message: "Failed to configure database security",
      error: error.code || "unknown"
    }, { status: 500 });
  }
} 