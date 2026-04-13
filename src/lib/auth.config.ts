import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      const canonicalBase = (process.env.APP_URL || process.env.AUTH_URL || baseUrl).replace(/\/+$/, '')

      if (url.startsWith('/')) {
        return `${canonicalBase}${url}`
      }

      try {
        const target = new URL(url)
        const runtimeBase = new URL(baseUrl)
        if (target.origin === runtimeBase.origin) {
          return `${canonicalBase}${target.pathname}${target.search}${target.hash}`
        }
      } catch {
        return `${canonicalBase}/login`
      }

      return url
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const protectedPrefixes = ['/dashboard', '/clientes', '/emprestimos', '/reports', '/chat', '/usuarios', '/perfil']
      const isOnProtectedRoute = protectedPrefixes.some((prefix) => nextUrl.pathname.startsWith(prefix))
      const isOnAdmin = nextUrl.pathname.startsWith('/usuarios')
      const role = (auth?.user as any)?.role
      
      if (isOnProtectedRoute) {
        if (!isLoggedIn) return false
        const isAdmin = role === 'ADM' || role === 'ADMIN'
        if (isOnAdmin && !isAdmin) {
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
        token.nome = (user as any).nome
        token.avatarUrl = (user as any).avatarUrl ?? null
        token.name = (user as any).name ?? (user as any).nome
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        ;(session.user as any).nome = (token as any).nome
        ;(session.user as any).avatarUrl = (token as any).avatarUrl ?? null
        session.user.name = (token as any).name ?? session.user.name
      }
      return session
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig
