/**
 * @fileoverview API route for deleting user account.
 * @module src/web/app/api/user/delete/route.ts
 * @dependencies next/server, next-auth
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { getServerSupabaseClient } from "@/lib/supabase";
import { deleteAllRoundsForUser } from "@/services/flashcard/roundManager";
import { AppError, ErrorCodes, ValidationError } from "@/lib/utils/errorHandling";
import { verifyPassword } from "@/app/api/auth/_shared/services/passwordService";
import { getUserByEmail } from "@/app/api/auth/_shared/services/userService";

/**
 * Delete user account
 * Requires authentication and password verification
 */
export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { password } = body;

    if (!password) {
      throw new ValidationError(
        "Password is required",
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        400,
        { field: "password" },
        "Password is required to delete your account."
      );
    }

    const userEmail = session.user.email;

    // Verify password
    const user = await getUserByEmail(userEmail);
    if (!user) {
      throw new AppError(
        "User not found",
        ErrorCodes.NOT_FOUND,
        404,
        {},
        "User account not found."
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new ValidationError(
        "Invalid password",
        ErrorCodes.VALIDATION_INVALID_CREDENTIALS,
        401,
        { field: "password" },
        "Incorrect password. Please try again."
      );
    }

    const supabase = getServerSupabaseClient();

    // Get user ID from database
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (userError || !dbUser) {
      throw new AppError(
        "Failed to find user",
        ErrorCodes.DB_QUERY_ERROR,
        500,
        { originalError: userError?.message },
        "Unable to delete account. Please try again."
      );
    }

    const userId = dbUser.id;

    // Delete all user data (rounds, matches, etc.)
    try {
      await deleteAllRoundsForUser(userId);
    } catch (error) {
      // Log but don't fail if rounds deletion fails
      console.error("Error deleting user rounds:", error);
    }

    // Delete user from database
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      throw new AppError(
        "Failed to delete user account",
        ErrorCodes.DB_QUERY_ERROR,
        500,
        { originalError: deleteError.message },
        "Unable to delete account. Please try again."
      );
    }

    // Note: Supabase Auth user deletion would need to be done via admin API
    // For now, we're just deleting from our database
    // The user will be signed out and won't be able to sign in again

    return NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage || error.message },
        { status: error.statusCode || 500 }
      );
    }

    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }
}

