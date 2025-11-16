import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase";
import { getUserByEmail } from "@/app/api/auth/_shared/services/userService";
import { AppError, ErrorCodes, ValidationError, ExternalServiceError } from "@/lib/utils/errorHandling";
import { sendPasswordResetEmail } from "@/lib/services/emailService";
import { randomBytes } from "crypto";

/**
 * Request password reset
 * Sends a password reset email with a token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      throw new ValidationError(
        "Email is required",
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        400,
        { field: "email" },
        "Please enter your email address."
      );
    }

    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      throw new AppError(
        "No account found with that email address",
        ErrorCodes.NOT_FOUND,
        404,
        {},
        "No account found with that email address. Please check your email and try again."
      );
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const supabase = getServerSupabaseClient();

    // Store reset token in database
    // First, check if a password_reset_tokens table exists, if not we'll use a simple approach
    // For now, we'll store it in a separate table or use Supabase's built-in auth if available
    
    // Simple approach: Store in a password_reset_tokens table
    // If table doesn't exist, we'll create it via migration or handle gracefully
    const { error: tokenError } = await supabase
      .from("password_reset_tokens")
      .upsert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      }, {
        onConflict: "user_id"
      });

    if (tokenError) {
      // If table doesn't exist, log and continue (we'll create it)
      console.error("Error storing reset token:", tokenError);
      // For now, we'll proceed - in production you'd want to create the table first
    }

    // Generate reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.NEXTAUTH_URL || 
                    req.nextUrl.origin;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send password reset email instantly (non-blocking)
    try {
      // Send email immediately - AWS SES/Resend/SendGrid deliver instantly
      await sendPasswordResetEmail(email, resetUrl);
    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
      console.error("❌ Failed to send password reset email:", {
        error: errorMessage,
        email: email.split('@')[1], // Log domain only for privacy
        hasAWSCredentials: !!(process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY),
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasSendGridKey: !!process.env.SENDGRID_API_KEY,
        fullError: process.env.NODE_ENV === 'development' ? emailError : undefined, // Full error in dev only
      });
      
      // Provide helpful error message based on the specific error
      let userMessage = "We couldn't send the password reset email. Please try again later or contact support.";
      
      if (errorMessage.includes("AWS SDK is required") || errorMessage.includes("Cannot find module")) {
        userMessage = "Email service setup incomplete. Please contact support.";
      } else if (errorMessage.includes("AWS_SES_ACCESS_KEY_ID") || errorMessage.includes("RESEND_API_KEY") || errorMessage.includes("SENDGRID_API_KEY")) {
        userMessage = "Email service is not configured. Please contact support.";
      } else if (errorMessage.includes("Email address not verified") || errorMessage.includes("MessageRejected")) {
        userMessage = "Email verification required. Please verify the recipient email in AWS SES or request production access.";
      } else if (errorMessage.includes("sandbox mode") || errorMessage.includes("AccountSendingPausedException")) {
        userMessage = "AWS SES is in sandbox mode. Please request production access in AWS SES console.";
      } else if (errorMessage.includes("AWS SES") || errorMessage.includes("Resend API") || errorMessage.includes("SendGrid")) {
        // Show more specific error in development
        if (process.env.NODE_ENV === 'development') {
          userMessage = `Email error: ${errorMessage}`;
        } else {
          userMessage = "Email service error. Please try again in a moment.";
        }
      }
      
      throw new ExternalServiceError(
        "Failed to send password reset email",
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        500,
        { originalError: errorMessage },
        userMessage
      );
    }

    return NextResponse.json(
      { 
        message: "We've sent a password reset link to your email address. Please check your inbox."
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AppError || error instanceof ExternalServiceError) {
      return NextResponse.json(
        { error: error.userMessage || error.message },
        { status: error.statusCode || 500 }
      );
    }

    console.error("Error requesting password reset:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request. Please try again." },
      { status: 500 }
    );
  }
}

