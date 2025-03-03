import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req) {
  // Check if supabase is configured properly.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase is not configured properly." }, { status: 500 });
  }

  try {
    // Check if stats table exists
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    if (tablesError) {
      console.error("Error checking tables:", tablesError);
      return NextResponse.json({ error: "Failed to check if stats table exists" }, { status: 500 });
    }
    
    const statsTableExists = tables.some(table => table.tablename === 'stats');
    
    if (!statsTableExists) {
      console.log("Stats table does not exist, creating it...");
      
      // Create stats table
      const { error: createError } = await supabase.rpc('create_stats_table');
      
      if (createError) {
        console.error("Error creating stats table:", createError);
        return NextResponse.json({ error: "Failed to create stats table" }, { status: 500 });
      }
      
      console.log("Stats table created successfully");
    } else {
      console.log("Stats table already exists");
      
      // Check if total_matches and correct_matches columns exist
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'stats');
        
      if (columnsError) {
        console.error("Error checking columns:", columnsError);
        return NextResponse.json({ error: "Failed to check stats table columns" }, { status: 500 });
      }
      
      const columnNames = columns.map(col => col.column_name);
      
      if (!columnNames.includes('total_matches')) {
        console.log("Adding total_matches column to stats table");
        
        // Add total_matches column
        const { error: addTotalMatchesError } = await supabase.rpc('add_total_matches_column');
        
        if (addTotalMatchesError) {
          console.error("Error adding total_matches column:", addTotalMatchesError);
          return NextResponse.json({ error: "Failed to add total_matches column" }, { status: 500 });
        }
        
        console.log("total_matches column added successfully");
      }
      
      if (!columnNames.includes('correct_matches')) {
        console.log("Adding correct_matches column to stats table");
        
        // Add correct_matches column
        const { error: addCorrectMatchesError } = await supabase.rpc('add_correct_matches_column');
        
        if (addCorrectMatchesError) {
          console.error("Error adding correct_matches column:", addCorrectMatchesError);
          return NextResponse.json({ error: "Failed to add correct_matches column" }, { status: 500 });
        }
        
        console.log("correct_matches column added successfully");
      }
    }
    
    return NextResponse.json({ success: true, message: "Stats table migration completed successfully" });
  } catch (err) {
    console.error("Unexpected error during migration:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
} 