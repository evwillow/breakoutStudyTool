import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase";
import { getUserByEmail } from "@/app/api/auth/_shared/services/userService";
import { hashPassword } from "@/app/api/auth/_shared/services/passwordService";
import { AppError, ErrorCodes, ValidationError } from "@/lib/utils/errorHandling";

/**
 * Confirm password reset
 * Validates token and updates password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, email, newPassword } = body;

    if (!token || !email || !newPassword) {
      throw new ValidationError(
        "Token, email, and new password are required",
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        400,
        { field: token ? (email ? "password" : "email") : "token" },
        "Please provide all required information."
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new ValidationError(
        "Password must be at least 8 characters",
        ErrorCodes.VALIDATION_INVALID_INPUT,
        400,
        { field: "password" },
        "Password must be at least 8 characters long."
      );
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      throw new AppError(
        "Invalid reset link",
        ErrorCodes.NOT_FOUND,
        404,
        {},
        "Invalid or expired password reset link."
      );
    }

    const supabase = getServerSupabaseClient();

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      throw new AppError(
        "Invalid reset link",
        ErrorCodes.NOT_FOUND,
        404,
        {},
        "Invalid or expired password reset link."
      );
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      // Delete expired token
      await supabase
        .from("password_reset_tokens")
        .delete()
        .eq("user_id", user.id);

      throw new AppError(
        "Reset link expired",
        ErrorCodes.VALIDATION_EXPIRED,
        400,
        {},
        "This password reset link has expired. Please request a new one."
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", user.id);

    if (updateError) {
      throw new AppError(
        "Failed to update password",
        ErrorCodes.DB_QUERY_ERROR,
        500,
        { originalError: updateError.message },
        "Unable to reset your password. Please try again."
      );
    }

    // Delete used token
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user.id);

    return NextResponse.json(
      { message: "Password has been reset successfully. You can now sign in with your new password." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage || error.message },
        { status: error.statusCode || 500 }
      );
    }

    console.error("Error confirming password reset:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}

