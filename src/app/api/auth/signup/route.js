// /src/app/api/auth/signup/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Database error checking for existing user:", checkError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

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

    // Return success - NextAuth will handle login separately
    return NextResponse.json({
      message: "User created successfully",
      user: { id: newUser.id, username: newUser.username },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}