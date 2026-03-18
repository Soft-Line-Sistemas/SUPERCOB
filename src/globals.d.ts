declare module "*.css";

import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      nome?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: string
    nome?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
  }
}
