// /src/app/api/auth/signup/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";
import { signupLimiter, rateLimit } from "@/lib/rateLimit";

// Verify hCaptcha token
async function verifyCaptcha(token) {
  // Development mode bypass - only in development environment
  if (process.env.NODE_ENV === 'development') {
    // Avoid logging in production environments
    console.log('Development environment: CAPTCHA verification bypassed');
    return true;
  }
  
  // Return false if no token provided
  if (!token) {
    // Log without revealing sensitive data
    console.error('CAPTCHA token missing');
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
    console.error("CAPTCHA verification error:", error.message);
    return false;
  }
}

// Check password complexity
function isPasswordComplex(password) {
  // Password must be at least 8 characters long
  if (password.length < 8) {
    return { isValid: false, reason: "Password must be at least 8 characters long" };
  }
  
  // Password must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, reason: "Password must contain at least one uppercase letter" };
  }
  
  // Password must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, reason: "Password must contain at least one lowercase letter" };
  }
  
  // Password must contain at least one number
  if (!/[0-9]/.test(password)) {
    return { isValid: false, reason: "Password must contain at least one number" };
  }
  
  // Password must contain at least one special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, reason: "Password must contain at least one special character" };
  }
  
  return { isValid: true };
}

// Try using a direct query to bypass RLS
const directQuery = async (email) => {
  try {
    const { data, error } = await supabase.rpc('check_user_exists', { email_param: email });
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("RPC not available:", error.message);
    
    // Direct SQL query may work if RPC fails
    try {
      // Use parameterized query to prevent SQL injection
      const { data, error: sqlError } = await supabase.rpc('execute_sql', { 
        sql_query: `SELECT EXISTS(SELECT 1 FROM public.users WHERE email = '${email.replace(/'/g, "''")}')` 
      });
      
      if (sqlError) throw sqlError;
      return !!data;
    } catch (sqlError) {
      console.error("SQL query also failed:", sqlError.message);
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
    
    // Check password complexity
    const passwordCheck = isPasswordComplex(password);
    if (!passwordCheck.isValid) {
      return NextResponse.json({ error: passwordCheck.reason }, { status: 400 });
    }
    
    // Verify CAPTCHA token
    const isValidCaptcha = await verifyCaptcha(captchaToken);
    if (!isValidCaptcha) {
      return NextResponse.json({ error: "Invalid CAPTCHA" }, { status: 400 });
    }

    // Check if the database connection is working
    try {
      // Log without sensitive info
      console.log("Testing database connection...");
      
      // Get list of all tables to check if users table exists
      const { data: tableList, error: tableListError } = await supabase
        .from('pg_tables')
        .select('schemaname, tablename')
        .eq('schemaname', 'public');
      
      if (tableListError) {
        console.error("Failed to list tables:", tableListError.message);
      } else {
        // Avoid logging full table data
        console.log(`Available tables count: ${tableList.length}`);
        
        const hasUsersTable = tableList.some(t => t.tablename === 'users');
        if (!hasUsersTable) {
          return NextResponse.json({ 
            error: "Missing users table", 
            details: "The users table does not exist in the public schema."
          }, { status: 500 });
        }
      }
      
      // Try to get a count to test if we have SELECT access
      const { data: countData, error: countError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (countError) {
        console.error("SELECT permission test failed:", countError.message);
        
        // Check for specific permission issues
        if (countError.message.includes("permission denied")) {
          return NextResponse.json({
            error: "Database permission issue", 
            details: "Your app doesn't have permission to access the users table. This is most likely an RLS policy issue.",
            solution: "1. Go to Supabase Dashboard → Table Editor → users → Auth → Configure proper RLS policies"
          }, { status: 403 });
        }
      }
    } catch (connError) {
      console.error("Failed to connect to database:", connError.message);
      return NextResponse.json({ 
        error: "Database connection failed", 
        details: connError.message 
      }, { status: 500 });
    }

    // Check if user already exists using a more direct approach
    let userExists = false;
    try {
      // Avoid logging full email - only show partial
      const emailDomain = email.split('@')[1];
      const emailPrefix = email.split('@')[0].substring(0, 3);
      console.log(`Checking if user exists: ${emailPrefix}***@${emailDomain}`);
      
      // First try the standard approach
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();  // Use maybeSingle instead of single to avoid PGRST116 errors

      if (checkError) {
        console.error("Standard user check failed:", checkError.message);
        
        // Try alternative approach
        const directResult = await directQuery(email);
        if (directResult !== null) {
          userExists = directResult;
          console.log("Alternative user check completed");
        } else {
          return NextResponse.json({ 
            error: "Cannot verify user existence", 
            details: "Both standard and direct queries failed. This is likely a database permission issue."
          }, { status: 500 });
        }
      } else {
        userExists = !!existingUser;
        console.log("User existence check completed");
      }
      
      if (userExists) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }
    } catch (userCheckError) {
      console.error("Error checking existing user:", userCheckError.message);
      return NextResponse.json({ 
        error: "Error checking existing user"
      }, { status: 500 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a username based on email (before @ symbol)
    const username = email.split('@')[0];

    // Store user in Supabase
    console.log("Creating new user account...");
    try {
      // Try to insert the user
      const { data: newUser, error: insertError } = await supabase.from("users").insert([
        {
          email,
          password: hashedPassword,
          username
        },
      ]).select();

      if (insertError) {
        console.error("User creation failed:", insertError.message);
        
        // Check for specific insertion errors
        if (insertError.message.includes("permission denied")) {
          return NextResponse.json({
            error: "Database permission issue", 
            details: "Your app doesn't have permission to insert into the users table. This is most likely an RLS policy issue.",
            solution: "Go to Supabase Dashboard → Table Editor → users → Auth → Configure proper RLS policies"
          }, { status: 403 });
        } else if (insertError.message.includes("violates not-null constraint")) {
          return NextResponse.json({
            error: "Database schema issue",
            details: "A required field is missing. Your users table might have required columns that weren't provided."
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
            details: `The column "${columnName}" doesn't exist in the users table.`
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
      console.error("Database error:", dbError.message);
      return NextResponse.json({
        error: "Database error creating user",
        isPaused: dbError.message.includes("not available") || dbError.message.includes("terminated"),
        tableIssue: dbError.message.includes("does not exist")
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Unexpected error in signup:", error.message);
    return NextResponse.json({
      error: "An unexpected error occurred"
    }, { status: 500 });
  }
}