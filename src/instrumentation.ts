export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return

  // ── Symlink para imagens persistentes ──────────────────────────────────────
  // A Hostinger recria o diretório nodejs/ a cada deploy, apagando arquivos locais.
  // As imagens ficam em /home/u500207944/uploads-permanentes/produtos/ e são
  // linkadas de public/uploads/produtos para sobreviver a novos deploys.
  try {
    const fs = await import('fs')
    const path = await import('path')
    const permanente = '/home/u500207944/uploads-permanentes/produtos'
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const link = path.join(uploadsDir, 'produtos')

    if (fs.existsSync(permanente)) {
      // Garante que public/uploads/ existe
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }
      // Remove symlink/dir existente se apontar para lugar errado
      if (fs.existsSync(link)) {
        const stat = fs.lstatSync(link)
        if (stat.isSymbolicLink() && fs.readlinkSync(link) !== permanente) {
          fs.unlinkSync(link)
        } else if (!stat.isSymbolicLink()) {
          // É um diretório real — não apaga
        }
      }
      if (!fs.existsSync(link)) {
        fs.symlinkSync(permanente, link, 'dir')
        console.log('[BOOT] Symlink de imagens criado:', link, '→', permanente)
      }
    }
  } catch (err) {
    console.warn('[BOOT] Symlink de imagens falhou (OK em dev):', err)
  }

  // ── Seed do usuário admin ──────────────────────────────────────────────────
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
