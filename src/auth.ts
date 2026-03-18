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

          const user = await prisma.usuario.findUnique({ where: { email } })
          if (user) {
            const passwordsMatch = await bcrypt.compare(senha, user.senha)
            if (!passwordsMatch) return null
            return {
              id: user.id,
              email: user.email,
              nome: user.nome,
              name: user.nome,
              avatarUrl: user.avatarUrl ?? null,
              role: user.role,
            } as any
          }

          // --- LOGIN TEMPORÁRIO (SEM BANCO DE DADOS) ---
          if (email === 'admin@supercob.com.br' && senha === 'admin123') {
            const created = await prisma.usuario.upsert({
              where: { email },
              update: {
                nome: 'Admin',
                role: 'ADMIN',
                isActive: true,
                canManageUsers: true,
                canManageClients: true,
                canManageLoans: true,
              },
              create: {
                nome: 'Admin',
                email,
                senha: await bcrypt.hash(senha, 10),
                role: 'ADMIN',
                isActive: true,
                canManageUsers: true,
                canManageClients: true,
                canManageLoans: true,
              },
              select: { id: true, email: true, nome: true, role: true, avatarUrl: true },
            })
            return {
              id: created.id,
              email: created.email,
              nome: created.nome,
              name: created.nome,
              avatarUrl: created.avatarUrl ?? null,
              role: created.role,
            } as any
          }

          if (email === 'op@supercob.com.br' && senha === 'op123456') {
            const created = await prisma.usuario.upsert({
              where: { email },
              update: {
                nome: 'Operador',
                role: 'OPERADOR',
                isActive: true,
                canManageUsers: false,
                canManageClients: true,
                canManageLoans: true,
              },
              create: {
                nome: 'Operador',
                email,
                senha: await bcrypt.hash(senha, 10),
                role: 'OPERADOR',
                isActive: true,
                canManageUsers: false,
                canManageClients: true,
                canManageLoans: true,
              },
              select: { id: true, email: true, nome: true, role: true, avatarUrl: true },
            })
            return {
              id: created.id,
              email: created.email,
              nome: created.nome,
              name: created.nome,
              avatarUrl: created.avatarUrl ?? null,
              role: created.role,
            } as any
          }
          // ---------------------------------------------
        }

        return null
      },
    }),
  ],
})
