import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const protectedPrefixes = ['/dashboard', '/clientes', '/emprestimos', '/reports', '/chat', '/usuarios']
      const isOnProtectedRoute = protectedPrefixes.some((prefix) => nextUrl.pathname.startsWith(prefix))
      const isOnAdmin = nextUrl.pathname.startsWith('/usuarios')
      const role = (auth?.user as any)?.role
      
      if (isOnProtectedRoute) {
        if (!isLoggedIn) return false
        if (isOnAdmin && role !== 'ADMIN') {
          return Response.redirect(new URL('/dashboard', nextUrl))
        }
        return true
      }

      if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig
