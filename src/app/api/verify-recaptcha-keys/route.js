import { NextResponse } from "next/server";

export async function GET() {
  try {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!siteKey || !secretKey) {
      return NextResponse.json({ 
        error: "Missing reCAPTCHA keys", 
        siteKeyExists: !!siteKey, 
        secretKeyExists: !!secretKey,
        fix: "Please ensure both NEXT_PUBLIC_RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY are set in your .env.local file"
      }, { status: 400 });
    }
    
    // Validate key formats
    const siteKeyValid = /^[a-zA-Z0-9_-]+$/.test(siteKey);
    const secretKeyValid = /^[a-zA-Z0-9_-]+$/.test(secretKey);
    
    if (!siteKeyValid || !secretKeyValid) {
      return NextResponse.json({
        error: "Invalid reCAPTCHA key format",
        siteKeyValid,
        secretKeyValid,
        fix: "Please ensure your reCAPTCHA keys have the correct format"
      }, { status: 400 });
    }
    
    // Test the secret key with a dummy token
    const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=dummy_token`,
    });
    
    if (!captchaResponse.ok) {
      return NextResponse.json({
        error: "reCAPTCHA verification API error",
        status: captchaResponse.status,
        statusText: captchaResponse.statusText,
        fix: "There may be network issues or the Google reCAPTCHA service may be down"
      }, { status: 500 });
    }
    
    const captchaData = await captchaResponse.json();
    
    // Provide comprehensive results including suggestions to fix
    const result = {
      siteKeyExists: true,
      secretKeyExists: true,
      siteKeyValid,
      secretKeyValid,
      siteKeyLength: siteKey.length,
      secretKeyLength: secretKey.length,
      verificationTest: captchaData,
      status: "Keys are properly formatted and the verification endpoint is accessible"
    };
    
    // Add specific advice based on verification result
    if (captchaData["error-codes"] && captchaData["error-codes"].includes("invalid-input-secret")) {
      result.error = "Invalid secret key";
      result.fix = "Your RECAPTCHA_SECRET_KEY is not valid. Please check your reCAPTCHA keys at https://www.google.com/recaptcha/admin";
    } else if (captchaData["error-codes"] && captchaData["error-codes"].includes("missing-input-response")) {
      // This is expected for a dummy token test
      result.status = "Secret key appears valid (expected error for dummy token)";
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying reCAPTCHA keys:", error);
    return NextResponse.json({ 
      error: "Error verifying reCAPTCHA keys", 
      details: error.message,
      fix: "Check your internet connection and ensure reCAPTCHA service is accessible" 
    }, { status: 500 });
  }
} 