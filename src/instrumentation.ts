export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err) => {
      console.error('[CRASH] uncaughtException:', err)
    })
    process.on('unhandledRejection', (reason) => {
      console.error('[CRASH] unhandledRejection:', reason)
    })

    try {
      const { db } = await import('@/lib/db')
      const { users } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')
      const bcrypt = await import('bcryptjs')
      const { sql } = await import('drizzle-orm')

      // Teste de conexão
      await db.execute(sql`SELECT 1`)
      console.log('[DB] Conexão OK')

      // Garante que o admin existe com credenciais corretas
      const adminEmail = 'contato@millas.com.br'
      const adminSenha = 'Millas2026!'
      const hash = await bcrypt.default.hash(adminSenha, 12)

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, adminEmail))
        .limit(1)

      if (existing) {
        await db
          .update(users)
          .set({ passwordHash: hash, ativo: true, role: 'admin' })
          .where(eq(users.email, adminEmail))
        console.log('[AUTH] Admin atualizado:', adminEmail)
      } else {
        await db.insert(users).values({
          nome: 'Admin',
          email: adminEmail,
          passwordHash: hash,
          role: 'admin',
          ativo: true,
        })
        console.log('[AUTH] Admin criado:', adminEmail)
      }
    } catch (err) {
      console.error('[DB] Erro na inicialização:', err)
    }
  }
}
