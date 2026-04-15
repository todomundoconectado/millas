import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const [user] = await db
            .select()
            .from(users)
            .where(and(
              eq(users.email, credentials.email as string),
              eq(users.ativo, true)
            ))
            .limit(1)

          if (!user) {
            console.log('[AUTH] Usuário não encontrado:', credentials.email)
            return null
          }

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          )

          if (!valid) {
            console.log('[AUTH] Senha incorreta para:', credentials.email)
            return null
          }

          return {
            id: String(user.id),
            email: user.email,
            name: user.nome,
            role: user.role,
          }
        } catch (err) {
          console.error('[AUTH] Erro de banco de dados:', err)
          return null
        }
      },
    }),
  ],
}
