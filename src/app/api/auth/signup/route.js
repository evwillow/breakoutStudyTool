// /src/app/api/auth/signup/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";
import { signupLimiter, rateLimit } from "@/lib/rateLimit";

// Force Node.js runtime
export const runtime = "nodejs";

export async function POST(req) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, signupLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const { email, password, captchaToken } = await req.json();
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }
    
    if (!captchaToken) {
      return NextResponse.json({ error: "reCAPTCHA verification required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Verify CAPTCHA
    try {
      console.log("Verifying CAPTCHA token...");
      
      // Ensure the secret key exists
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      if (!secretKey) {
        console.error("Missing RECAPTCHA_SECRET_KEY in environment variables");
        return NextResponse.json({ 
          error: "Server configuration error", 
          details: "Missing reCAPTCHA secret key" 
        }, { status: 500 });
      }
      
      const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${captchaToken}`,
      });

      if (!captchaResponse.ok) {
        console.error(`reCAPTCHA verification HTTP error: ${captchaResponse.status}`);
        return NextResponse.json({ 
          error: "reCAPTCHA verification failed", 
          details: `Google API error: ${captchaResponse.statusText || captchaResponse.status}` 
        }, { status: 500 });
      }

      const captchaData = await captchaResponse.json();
      console.log("CAPTCHA verification response:", captchaData);
      
      if (!captchaData.success) {
        const errorCodes = captchaData["error-codes"] || ["unknown-error"];
        console.error("CAPTCHA verification failed:", errorCodes);
        
        // Map error codes to user-friendly messages
        let errorMessage = "reCAPTCHA verification failed";
        if (errorCodes.includes("missing-input-response")) {
          errorMessage = "Please complete the reCAPTCHA challenge";
        } else if (errorCodes.includes("invalid-input-response")) {
          errorMessage = "The reCAPTCHA response is invalid or expired";
        } else if (errorCodes.includes("timeout-or-duplicate")) {
          errorMessage = "The reCAPTCHA has timed out, please try again";
        }
        
        return NextResponse.json({ 
          error: errorMessage, 
          details: errorCodes 
        }, { status: 400 });
      }
      
      // Additional validation - check score for v3 reCAPTCHA if present
      if (captchaData.score !== undefined) {
        console.log(`reCAPTCHA score: ${captchaData.score}`);
        if (captchaData.score < 0.5) {
          return NextResponse.json({ 
            error: "reCAPTCHA verification failed", 
            details: "Suspicious activity detected" 
          }, { status: 400 });
        }
      }
    } catch (error) {
      console.error("CAPTCHA verification error:", error);
      return NextResponse.json({ 
        error: "reCAPTCHA verification failed", 
        details: error.message 
      }, { status: 500 });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Database error checking for existing user:", checkError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in Supabase
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([{ 
        email, 
        password: hashedPassword,
        email_verified: false,
        created_at: new Date().toISOString()
      }])
      .select("id, email")
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ error: "Database insert error" }, { status: 500 });
    }

    // Return success - NextAuth will handle login separately
    return NextResponse.json({
      message: "User created successfully",
      user: { id: newUser.id, email: newUser.email },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}