export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return

  const { db } = await import('@/lib/db')
  const { users } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const bcrypt = await import('bcryptjs')

  const email = 'contato@millas.com.br'
  const senha = 'Millas2026!'

  try {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!existing) {
      const hash = await bcrypt.hash(senha, 12)
      await db.insert(users).values({
        nome: 'Admin',
        email,
        passwordHash: hash,
        role: 'admin',
        ativo: true,
      })
      console.log('[BOOT] Admin criado:', email)
    }
  } catch {
    // Tabela pode não existir ainda
  }
}
