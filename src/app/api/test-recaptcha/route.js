import { NextResponse } from "next/server";

export async function GET() {
  try {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!siteKey || !secretKey) {
      return NextResponse.json({ 
        error: "Missing reCAPTCHA keys", 
        siteKeyExists: !!siteKey, 
        secretKeyExists: !!secretKey 
      }, { status: 400 });
    }
    
    // Test the secret key with a dummy token
    const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=dummy_token`,
    });
    
    const captchaData = await captchaResponse.json();
    
    return NextResponse.json({
      siteKeyExists: true,
      secretKeyExists: true,
      siteKeyLength: siteKey.length,
      secretKeyLength: secretKey.length,
      verificationTest: captchaData,
    });
  } catch (error) {
    console.error("Error verifying reCAPTCHA keys:", error);
    return NextResponse.json({ 
      error: "Error verifying reCAPTCHA keys", 
      details: error.message 
    }, { status: 500 });
  }
}

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