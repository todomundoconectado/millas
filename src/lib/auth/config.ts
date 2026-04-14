import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// Admin credentials — store hashed password in env, never plain text
// Generate with: node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAdminRoute = nextUrl.pathname.startsWith('/admin')
      const isLoginPage = nextUrl.pathname === '/admin/login'

      if (isAdminRoute && !isLoginPage) {
        if (!isLoggedIn) {
          const loginUrl = new URL('/admin/login', nextUrl)
          loginUrl.searchParams.set('redirect', nextUrl.pathname)
          return Response.redirect(loginUrl)
        }
        return true
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string
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

        const adminEmail = process.env.ADMIN_EMAIL
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH

        if (!adminEmail || !adminPasswordHash) return null

        if (credentials.email !== adminEmail) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          adminPasswordHash
        )

        if (!valid) return null

        return {
          id: '1',
          email: adminEmail,
          name: 'Administrador',
          role: 'admin',
        }
      },
    }),
  ],
}
