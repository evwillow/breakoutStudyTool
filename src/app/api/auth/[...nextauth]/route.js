import NextAuth from "next-auth/next"; // Updated import path for the App Router
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Create a server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const authOptions = {
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
            email: user.username // Using username as email for compatibility
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
      // On first sign in, add user ID to the token
      if (user) {
        token.sub = user.id;
      }
      console.log("JWT callback:", token);
      return token;
    },
    async session({ session, token }) {
      // Add user ID from token into the session object
      if (token && token.sub) {
        session.user.id = token.sub;
      }
      console.log("Session callback:", session);
      return session;
    }
  },
  // Do not include the pages option – it's not supported in the App Router
  secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-do-not-use-in-production",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  debug: process.env.NODE_ENV === "development"
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
