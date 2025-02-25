// /src/app/api/auth/signup/route.js
import { NextResponse } from "next/server";
import supabase from "@/config/supabase";
import bcrypt from "bcryptjs";
import { signJwt } from "@/utils/jwt"; // Helper function to generate JWT

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in Supabase
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([{ username, password: hashedPassword }])
      .select("id, username")
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ error: "Database insert error" }, { status: 500 });
    }

    // Generate JWT token for automatic login
    const token = signJwt({ id: newUser.id, username: newUser.username });

    return NextResponse.json({
      message: "User created successfully",
      token,
      user: { id: newUser.id, username: newUser.username },
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
