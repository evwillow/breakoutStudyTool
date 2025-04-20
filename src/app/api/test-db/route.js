import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET() {
  try {
    // Test basic connection
    console.log("Testing database connection...");
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error("Connection error:", connectionError);
      return NextResponse.json({
        status: "error",
        message: "Database connection failed",
        error: connectionError
      }, { status: 500 });
    }

    // Check table structure
    console.log("Testing users table structure...");
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('test_table_structure');

    // If RPC doesn't exist, try querying the table directly
    if (tableError && tableError.message.includes("function") && tableError.message.includes("does not exist")) {
      console.log("RPC not available, trying direct table query");
      const { data: tableColumns, error: columnsError } = await supabase
        .from('users')
        .select('id, email')
        .limit(1);
        
      if (columnsError) {
        console.error("Table structure error:", columnsError);
        return NextResponse.json({
          status: "error",
          message: "Failed to query users table structure",
          error: columnsError
        }, { status: 500 });
      }
      
      return NextResponse.json({
        status: "success",
        message: "Database connection successful",
        tableStructure: "Users table appears to be accessible",
        connectionInfo: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Supabase URL is configured" : "Missing Supabase URL"
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      connectionInfo: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Supabase URL is configured" : "Missing Supabase URL",
      tableInfo: tableInfo || "No table info available"
    });
  } catch (error) {
    console.error("Unexpected error testing database:", error);
    return NextResponse.json({
      status: "error",
      message: "Failed to test database",
      error: {
        name: error.name,
        message: error.message
      }
    }, { status: 500 });
  }
} 