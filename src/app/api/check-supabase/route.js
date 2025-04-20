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
          hasKey: !!supabaseKey,
          url: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : "Not set"
        }
      });
    }

    // Create a new client for testing
    console.log("Creating a new Supabase client for testing...");
    const testSupabase = createClient(supabaseUrl, supabaseKey);

    // Test connection with a simple query
    console.log("Testing connection...");
    const { data, error } = await testSupabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
      console.error("Connection error:", error);
      
      // Check if it's a permission issue
      if (error.code === "PGRST301" || error.message.includes("permission denied")) {
        return NextResponse.json({
          status: "error",
          message: "Database permission error",
          details: "The 'users' table might not exist or your anon key doesn't have access to it",
          error: error
        });
      }
      
      return NextResponse.json({
        status: "error",
        message: "Failed to connect to Supabase",
        error: error
      });
    }

    // Success - connection works
    return NextResponse.json({
      status: "success",
      message: "Successfully connected to Supabase",
      supabaseInfo: {
        url: `${supabaseUrl.substring(0, 15)}...`,
        keyValid: true
      }
    });
  } catch (error) {
    console.error("Error testing Supabase connection:", error);
    return NextResponse.json({
      status: "error",
      message: "Error testing Supabase connection",
      error: {
        name: error.name,
        message: error.message
      }
    });
  }
} 