import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        status: "error",
        message: "Missing Supabase credentials",
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }

    // Create a new client for testing
    console.log("Creating a Supabase client for database setup...");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if tables exist
    console.log("Checking if users table exists...");
    const { error: tableCheckError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    // If there's a permission error or table doesn't exist error
    if (tableCheckError && 
        (tableCheckError.code === 'PGRST301' || 
         tableCheckError.message.includes("does not exist") || 
         tableCheckError.message.includes("permission denied"))) {
      
      console.log("Users table doesn't exist or not accessible. Attempting to create via SQL...");
      
      // Try to create table with SQL
      // Note: This requires that your Supabase key has SQL execution permissions
      try {
        const { error: createTableError } = await supabase.rpc('create_users_table');
        
        if (createTableError) {
          console.error("RPC error:", createTableError);
          return NextResponse.json({
            status: "error",
            message: "Failed to create users table via RPC",
            error: createTableError,
            help: "You need to create the users table manually in the Supabase dashboard."
          });
        }
        
        return NextResponse.json({
          status: "success",
          message: "Users table created successfully"
        });
      } catch (rpcError) {
        console.error("Error calling RPC:", rpcError);
        
        return NextResponse.json({
          status: "error",
          message: "Your database needs to be set up manually",
          details: "Please go to the Supabase dashboard and create the following table:",
          schema: `
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
          `,
          error: rpcError.message
        });
      }
    } else if (tableCheckError) {
      // Some other error occurred while checking the table
      console.error("Error checking users table:", tableCheckError);
      return NextResponse.json({
        status: "error",
        message: "Error checking if users table exists",
        error: tableCheckError
      });
    }

    // If we get here, the users table exists
    return NextResponse.json({
      status: "success",
      message: "Database tables already exist",
      details: "The users table is correctly set up and accessible"
    });
    
  } catch (error) {
    console.error("Error setting up database:", error);
    return NextResponse.json({
      status: "error",
      message: "Failed to setup database",
      error: {
        name: error.name,
        message: error.message
      }
    });
  }
} 