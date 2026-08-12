import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    MicrosoftEntraID,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // We will hit the API Gateway to validate credentials
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        const user = await res.json();

        if (res.ok && user) {
          return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        // Initial sign in
        token.accessToken = user.accessToken;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
});
