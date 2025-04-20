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
      console.error("Error checking for users table:", tableError);
      return NextResponse.json({
        status: "error",
        message: "Failed to check if users table exists",
        error: tableError
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
          console.error("Failed to create users table:", createError);
          return NextResponse.json({
            status: "error",
            message: "Failed to create users table",
            error: createError,
            suggestion: "The users table doesn't exist and we couldn't create it. You need to create it manually in the Supabase dashboard."
          }, { status: 500 });
        }
        
        console.log("Users table created successfully");
      } catch (createError) {
        console.error("Error creating users table:", createError);
        
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
            error: executeError,
            suggestion: "You need to create the users table manually"
          }, { status: 500 });
        }
      }
    }
    
    // Try to disable RLS on the users table
    console.log("Attempting to disable RLS on users table...");
    try {
      const { error: rlsError } = await supabase.rpc('run_sql', {
        sql: `ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;`
      });
      
      if (rlsError) {
        console.error("Failed to disable RLS with run_sql:", rlsError);
        
        // Try with execute
        try {
          const { error: executeError } = await supabase.rpc('execute', {
            command: `ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;`
          });
          
          if (executeError) throw executeError;
          console.log("RLS disabled successfully with execute");
        } catch (executeError) {
          console.error("Failed to disable RLS with execute:", executeError);
          return NextResponse.json({
            status: "error",
            message: "Permission denied: Cannot disable RLS",
            error: executeError,
            solution: "Please disable RLS manually in the Supabase dashboard: Table Editor → users → Auth → Toggle RLS off"
          }, { status: 403 });
        }
      } else {
        console.log("RLS disabled successfully");
      }
    } catch (rlsError) {
      console.error("Error disabling RLS:", rlsError);
      return NextResponse.json({
        status: "error",
        message: "Failed to disable RLS",
        error: rlsError,
        solution: "Please disable RLS manually in the Supabase dashboard: Table Editor → users → Auth → Toggle RLS off"
      }, { status: 500 });
    }
    
    // Test if we can now access the users table
    console.log("Testing access to users table...");
    const { error: accessError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (accessError) {
      console.error("Still can't access users table:", accessError);
      return NextResponse.json({
        status: "partial",
        message: "RLS may be disabled, but still can't access the users table",
        error: accessError,
        manualSolution: "Please follow these steps in the Supabase dashboard:\n1. Go to Table Editor\n2. Select users table\n3. Click Auth (right panel)\n4. Turn off Row Level Security\n5. Click Save"
      });
    }
    
    return NextResponse.json({
      status: "success",
      message: "Successfully fixed database permissions",
      details: "Row Level Security (RLS) has been disabled on the users table. You can now sign up."
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({
      status: "error",
      message: "Failed to fix database permissions",
      error: {
        name: error.name,
        message: error.message
      }
    }, { status: 500 });
  }
} 