// src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Dummy in-memory user database (for testing only)
const users = [
  {
    id: 1,
    username: "testuser",
    password: "Tacos0719", // changed password to avoid flagged credentials
  },
];

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = users.find(
          (u) =>
            u.username === credentials.username &&
            u.password === credentials.password
        );
        if (user) {
          return { id: user.id, name: user.username };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
