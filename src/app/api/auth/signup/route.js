// /src/app/api/auth/signup/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";
import { signupLimiter, rateLimit } from "@/lib/rateLimit";

// Verify hCaptcha token
async function verifyCaptcha(token) {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: CAPTCHA verification bypassed');
    return true;
  }
  
  // Return false if no token provided
  if (!token) {
    console.error('No CAPTCHA token provided');
    return false;
  }
  
  try {
    const secret = process.env.HCAPTCHA_SECRET_KEY;
    
    if (!secret) {
      console.error('Missing HCAPTCHA_SECRET_KEY environment variable');
      return false;
    }
    
    // Make request to hCaptcha verification API
    const response = await fetch(
      'https://hcaptcha.com/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `response=${token}&secret=${secret}`,
      }
    );
    
    if (!response.ok) {
      console.error('CAPTCHA verification API response not OK:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('CAPTCHA verification failed:', data['error-codes'] || 'Unknown error');
    }
    
    return data.success;
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return false;
  }
}

// Try using a direct query to bypass RLS
const directQuery = async (email) => {
  try {
    const { data, error } = await supabase.rpc('check_user_exists', { email_param: email });
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("RPC not available:", error);
    
    // Direct SQL query may work if RPC fails
    try {
      const { data, error: sqlError } = await supabase.rpc('execute_sql', { 
        sql_query: `SELECT EXISTS(SELECT 1 FROM public.users WHERE email = '${email.replace(/'/g, "''")}')` 
      });
      
      if (sqlError) throw sqlError;
      return !!data;
    } catch (sqlError) {
      console.error("SQL query also failed:", sqlError);
      return null;
    }
  }
};

export async function POST(req) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, signupLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const { email, password, captchaToken } = await req.json();
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    
    // Verify CAPTCHA token
    const isValidCaptcha = await verifyCaptcha(captchaToken);
    if (!isValidCaptcha) {
      return NextResponse.json({ error: "Invalid CAPTCHA" }, { status: 400 });
    }

    // Check if the database connection is working
    try {
      console.log("Testing database connection before user check...");
      
      // Get list of all tables to check if users table exists
      const { data: tableList, error: tableListError } = await supabase
        .from('pg_tables')
        .select('schemaname, tablename')
        .eq('schemaname', 'public');
      
      if (tableListError) {
        console.error("Failed to list tables:", tableListError);
      } else {
        console.log("Available tables:", tableList);
        
        const hasUsersTable = tableList.some(t => t.tablename === 'users');
        if (!hasUsersTable) {
          return NextResponse.json({ 
            error: "Missing users table", 
            details: "The users table does not exist in the public schema.",
            availableTables: tableList.map(t => t.tablename)
          }, { status: 500 });
        }
      }
      
      // Try to get a count to test if we have SELECT access
      const { data: countData, error: countError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (countError) {
        console.error("SELECT permission test failed:", countError);
        
        // Check for specific permission issues
        if (countError.message.includes("permission denied")) {
          return NextResponse.json({
            error: "Database permission issue", 
            details: "Your app doesn't have permission to access the users table. This is most likely an RLS policy issue.",
            solution: "1. Go to Supabase Dashboard → Table Editor → users → Auth → Disable RLS temporarily for testing"
          }, { status: 403 });
        }
      } else {
        console.log("SELECT permission test passed");
      }
    } catch (connError) {
      console.error("Failed to connect to database:", connError);
      return NextResponse.json({ 
        error: "Database connection failed", 
        details: connError.message 
      }, { status: 500 });
    }

    // Check if user already exists using a more direct approach
    let userExists = false;
    try {
      console.log(`Checking if user with email exists: ${email.substring(0, 3)}***@${email.split('@')[1]}`);
      
      // First try the standard approach
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();  // Use maybeSingle instead of single to avoid PGRST116 errors

      if (checkError) {
        console.error("Standard user check failed:", checkError);
        
        // Try alternative approach
        const directResult = await directQuery(email);
        if (directResult !== null) {
          userExists = directResult;
          console.log("Direct query for user existence result:", userExists);
        } else {
          return NextResponse.json({ 
            error: "Cannot verify user existence", 
            details: "Both standard and direct queries failed. This is likely a database permission issue.",
            originalError: checkError.message
          }, { status: 500 });
        }
      } else {
        userExists = !!existingUser;
        console.log("Standard user check result:", userExists);
      }
      
      if (userExists) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }
    } catch (userCheckError) {
      console.error("Unexpected error checking user:", userCheckError);
      return NextResponse.json({ 
        error: "Error checking existing user", 
        details: userCheckError.message 
      }, { status: 500 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a username based on email (before @ symbol)
    const username = email.split('@')[0];

    // Store user in Supabase
    console.log("Attempting to create new user...");
    try {
      // Check table structure first
      console.log("Checking table structure...");
      try {
        const { data: tableInfo, error: tableInfoError } = await supabase.rpc('get_table_columns', { 
          table_name: 'users' 
        });
        
        if (tableInfoError) {
          console.error("Error getting table columns:", tableInfoError);
        } else {
          console.log("Table columns info:", tableInfo);
        }
      } catch (tableInfoError) {
        console.error("Failed to get table info:", tableInfoError);
      }

      // Try to insert the user
      const { data: newUser, error: insertError } = await supabase.from("users").insert([
        {
          email,
          password: hashedPassword,
          username
        },
      ]).select();

      if (insertError) {
        console.error("User creation failed:", insertError);
        
        // Check for specific insertion errors
        if (insertError.message.includes("permission denied")) {
          return NextResponse.json({
            error: "Database permission issue", 
            details: "Your app doesn't have permission to insert into the users table. This is most likely an RLS policy issue.",
            solution: "Go to Supabase Dashboard → Table Editor → users → Auth → Disable RLS temporarily or configure RLS policies"
          }, { status: 403 });
        } else if (insertError.message.includes("violates not-null constraint")) {
          return NextResponse.json({
            error: "Database schema issue",
            details: "A required field is missing. Your users table might have required columns that weren't provided.",
            solution: "Check the users table structure and ensure all required fields are included in the insert"
          }, { status: 400 });
        } else if (insertError.message.includes("duplicate key")) {
          return NextResponse.json({
            error: "User already exists",
            details: "A user with this email address already exists in the database."
          }, { status: 400 });
        } else if (insertError.message.includes("column") && insertError.message.includes("does not exist")) {
          // Extract column name from error message
          const columnMatch = insertError.message.match(/column "([^"]+)" of relation/);
          const columnName = columnMatch ? columnMatch[1] : "unknown";
          
          return NextResponse.json({
            error: "Database schema mismatch",
            details: `The column "${columnName}" doesn't exist in the users table.`,
            solution: `Check your table structure or create the missing column "${columnName}" in the users table.`
          }, { status: 400 });
        }
        
        return NextResponse.json({
          error: "Failed to create user account",
          details: insertError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        message: "User registered successfully",
        user: {
          id: newUser[0]?.id,
          email: newUser[0]?.email,
          username: newUser[0]?.username
        }
      });
    } catch (dbError) {
      console.error("Database error creating user:", dbError);
      return NextResponse.json({
        error: "Database error creating user",
        details: dbError.message,
        isPaused: dbError.message.includes("not available") || dbError.message.includes("terminated"),
        tableIssue: dbError.message.includes("does not exist")
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Unexpected error in signup route:", error);
    return NextResponse.json({
      error: "An unexpected error occurred",
      details: error.message
    }, { status: 500 });
  }
}