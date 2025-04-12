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
    if (!email || !password || !captchaToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Verify CAPTCHA
    try {
      console.log("Verifying CAPTCHA token...");
      const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
      });

      const captchaData = await captchaResponse.json();
      console.log("CAPTCHA verification response:", captchaData);
      
      if (!captchaData.success) {
        console.error("CAPTCHA verification failed:", captchaData);
        return NextResponse.json({ 
          error: "Invalid CAPTCHA", 
          details: captchaData["error-codes"] || "Unknown error" 
        }, { status: 400 });
      }
    } catch (error) {
      console.error("CAPTCHA verification error:", error);
      return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 500 });
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