import NextAuth from "next-auth/next"; // Use the App Router–compatible import
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Validate required environment variables.
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Missing NEXTAUTH_SECRET environment variable");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials || !credentials.username || !credentials.password) {
          return null;
        }
        // Retrieve the user from Supabase.
        const { data: user, error } = await supabase
          .from("users")
          .select("id, username, password")
          .eq("username", credentials.username)
          .single();

        if (error || !user) {
          console.error("User not found:", error?.message);
          return null;
        }

        // Validate the provided password.
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          console.error("Invalid password");
          return null;
        }

        // Return user details for NextAuth session.
        return { id: user.id, name: user.username, email: user.username };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign in, add the user ID to the token.
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      // Add the user ID from the token to the session object.
      if (token && token.sub) session.user.id = token.sub;
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  debug: process.env.NODE_ENV === "development"
};

// Create a NextAuth handler and export GET and POST.
const handler = NextAuth(authOptions);
export const GET = handler;
export const POST = handler;
