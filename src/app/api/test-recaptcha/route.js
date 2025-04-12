import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    
    console.log("Testing reCAPTCHA verification with token:", token.substring(0, 10) + "...");
    
    const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });
    
    const captchaData = await captchaResponse.json();
    console.log("reCAPTCHA test verification response:", captchaData);
    
    return NextResponse.json(captchaData);
  } catch (error) {
    console.error("reCAPTCHA test verification error:", error);
    return NextResponse.json({ error: "Verification failed", details: error.message }, { status: 500 });
  }
} 