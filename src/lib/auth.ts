import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Upsert profile row on first sign-in
      try {
        const supabase = createServiceRoleClient();
        const { error } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            display_name: user.name ?? user.email.split("@")[0],
            email: user.email,
            avatar_url: user.image ?? null,
            provider: account?.provider ?? "unknown",
          },
          { onConflict: "id" },
        );
        if (error) console.error("Profile upsert error:", error);
      } catch (err) {
        console.error("Profile upsert failed:", err);
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
