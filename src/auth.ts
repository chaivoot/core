import NextAuth from "next-auth";
import LINE from "next-auth/providers/line";
import { upsertLineUser } from "@/lib/data/users";

// LINE Login (web login) - อ่านค่าจาก AUTH_LINE_ID / AUTH_LINE_SECRET / AUTH_SECRET
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [LINE],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "line" && profile?.sub) {
        const user = await upsertLineUser({
          lineUserId: profile.sub,
          name: typeof profile.name === "string" ? profile.name : null,
          image: typeof profile.picture === "string" ? profile.picture : null,
        });
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
