import NextAuth from 'next-auth'
import { authConfig } from './lib/auth.config'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { prisma } from './lib/prisma'
import bcrypt from 'bcryptjs'

export const { auth, signIn, signOut, handlers: { GET, POST } } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), senha: z.string().min(6) })
          .safeParse(credentials)

        if (parsedCredentials.success) {
          const { email, senha } = parsedCredentials.data

          // --- LOGIN TEMPORÁRIO (SEM BANCO DE DADOS) ---
          if (email === 'admin@supercob.com.br' && senha === 'admin123') {
            return {
              id: 'temp-admin-id',
              email: 'admin@supercob.com.br',
              nome: 'Admin Temporário',
              role: 'ADMIN'
            } as any;
          }

          if (email === 'op@supercob.com.br' && senha === 'op123456') {
            return {
              id: 'temp-op-id',
              email: 'op@supercob.com.br',
              nome: 'Operador Temporário',
              role: 'OPERADOR'
            } as any;
          }
          // ---------------------------------------------

          const user = await prisma.usuario.findUnique({ where: { email } })
          if (!user) return null
          const passwordsMatch = await bcrypt.compare(senha, user.senha)

          if (passwordsMatch) return {
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role
          } as any
        }

        return null
      },
    }),
  ],
})
