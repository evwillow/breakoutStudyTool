import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import supabase from "./supabase";

// Check required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Missing NEXTAUTH_SECRET environment variable");
}

/**
 * NextAuth.js configuration options
 * This follows the latest Next.js App Router approach
 */
export const authConfig = {
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

        try {
          // Retrieve the user from Supabase
          const { data: user, error } = await supabase
            .from("users")
            .select("id, username, password")
            .eq("username", credentials.username)
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
            name: user.username, 
            email: user.username 
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
          id: token.id,
          name: token.name,
          email: token.email
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