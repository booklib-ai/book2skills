import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

declare module "next-auth" {
  interface Session {
    githubAccessToken?: string
    githubUsername?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: { scope: "read:user user:email public_repo" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.githubAccessToken = account.access_token
      }
      if (profile?.login) {
        token.githubUsername = profile.login as string
      }
      return token
    },
    async session({ session, token }) {
      session.githubAccessToken = token.githubAccessToken as string
      session.githubUsername = token.githubUsername as string
      return session
    },
  },
})
