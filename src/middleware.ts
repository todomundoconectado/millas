import NextAuth from 'next-auth'

// Instância edge-safe: somente JWT (sem DB, sem mysql2)
const { auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [],
  pages: { signIn: '/admin/login' },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user
      const isLoginPage = nextUrl.pathname === '/admin/login'
      if (!isLoginPage && !isLoggedIn) {
        const loginUrl = new URL('/admin/login', nextUrl)
        loginUrl.searchParams.set('redirect', nextUrl.pathname)
        return Response.redirect(loginUrl)
      }
      return true
    }
  }
})

export default auth

export const config = {
  matcher: ['/admin/:path*'],
}
