import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { sql } from 'drizzle-orm'

// Rota de setup única — remove após uso
export async function GET() {
  const log: string[] = []

  // 1. Testar conexão
  try {
    await db.execute(sql`SELECT 1`)
    log.push('✅ DB connection OK')
  } catch (err: unknown) {
    const e = err as { message?: string; cause?: { code?: string; errno?: number; message?: string } }
    log.push(`❌ DB connection FAILED: ${e.message}`)
    log.push(`❌ Causa: code=${e.cause?.code} errno=${e.cause?.errno} msg=${e.cause?.message}`)
    return NextResponse.json({ log }, { status: 500 })
  }

  // 2. Verificar se tabela users existe
  try {
    await db.execute(sql`SELECT 1 FROM users LIMIT 1`)
    log.push('✅ Tabela users existe')
  } catch (err) {
    log.push(`❌ Tabela users não existe: ${err}`)
    return NextResponse.json({ log }, { status: 500 })
  }

  // 3. Criar ou atualizar admin
  const email = 'contato@millas.com.br'
  const senha = 'Millas2026!'
  const hash = await bcrypt.hash(senha, 12)

  try {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (existing) {
      await db.update(users)
        .set({ passwordHash: hash, ativo: true, role: 'admin' })
        .where(eq(users.email, email))
      log.push(`✅ Usuário ${email} atualizado (novo hash gerado)`)
    } else {
      await db.insert(users).values({
        nome: 'Admin',
        email,
        passwordHash: hash,
        role: 'admin',
        ativo: true,
      })
      log.push(`✅ Usuário ${email} criado`)
    }
  } catch (err) {
    log.push(`❌ Erro ao criar/atualizar usuário: ${err}`)
    return NextResponse.json({ log }, { status: 500 })
  }

  log.push('🔑 Senha: Millas2026!')
  log.push('⚠️  Apague esta rota após o login funcionar')

  return NextResponse.json({ log })
}
