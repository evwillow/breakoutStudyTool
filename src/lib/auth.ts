/**
 * Authentication Configuration
 * 
 * Configures NextAuth.js for user authentication in the application.
 * Features:
 * - Credentials-based authentication with username/password
 * - Integration with Supabase for user data storage
 * - Password hashing with bcrypt for security
 * - JWT token management for session persistence
 * - Custom session handling and user data enrichment
 */
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import supabase from "./supabase";

// Verify that required environment variables are set
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Missing NEXTAUTH_SECRET environment variable");
}

/**
 * NextAuth.js configuration options
 * Follows the Next.js App Router approach for authentication
 */
export const authConfig: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      /**
       * Authorize function validates user credentials
       * Retrieves user from Supabase and verifies password
       */
      async authorize(credentials) {
        if (!credentials || !credentials.email || !credentials.password) {
          return null;
        }

        try {
          // Query Supabase for user with matching email
          const { data: user, error } = await supabase
            .from("users")
            .select("id, email, password")
            .eq("email", credentials.email)
            .single();

          if (error || !user) {
            console.error("User not found:", error?.message);
            return null;
          }

          // Validate the provided password
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.error("Invalid password");
            return null;
          }

          // Return user details
          return { 
            id: user.id, 
            name: user.email, 
            email: user.email 
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
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          name: token.name as string,
          email: token.email as string
        };
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development"
}; 