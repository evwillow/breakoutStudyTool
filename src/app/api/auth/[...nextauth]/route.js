// /src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import supabase from "@/config/supabase";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      // ... your existing configuration
      async authorize(credentials) {
        const { username, password } = credentials;

        // Fetch user from Supabase
        const { data: user, error } = await supabase
          .from("users")
          .select("id, username, password")
          .eq("username", username)
          .single();

        if (!user) return null;

        // Compare hashed passwords
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        // Make sure id is explicitly returned
        return { 
          id: user.id, 
          name: user.username,
          email: username // Adding email field can help with compatibility
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Add the user ID to the session from the token
      if (token && token.sub) {
        session.user.id = token.sub;
      }
      console.log("Session callback:", session);
      return session;
    },
    async jwt({ token, user }) {
      // Persist the user ID to the token
      if (user) {
        token.sub = user.id; 
      }
      console.log("JWT callback:", token);
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  debug: true, // Enable debugging
});

export { handler as GET, handler as POST };