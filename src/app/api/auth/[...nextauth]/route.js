// /src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// NextAuth configuration
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Fetch user from Supabase
          const { data: user, error } = await supabase
            .from("users")
            .select("id, username, password")
            .eq("username", credentials.username)
            .single();

          if (error || !user) {
            console.error("User not found:", error?.message);
            return null;
          }

          // Compare passwords
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            console.error("Invalid password");
            return null;
          }

          // Return user data for session
          return {
            id: user.id,
            name: user.username,
            email: user.username // Using username as email for NextAuth compatibility
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to token when first signed in
      if (user) {
        token.sub = user.id;
      }
      console.log("JWT callback:", token);
      return token;
    },
    async session({ session, token }) {
      // Add user ID to session from token
      if (token && token.sub) {
        session.user.id = token.sub;
      }
      console.log("Session callback:", session);
      return session;
    }
  },
  pages: {
    signIn: '/' // Use homepage for sign in
  },
  secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-do-not-use-in-production",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  debug: process.env.NODE_ENV === "development"
});

export { handler as GET, handler as POST };