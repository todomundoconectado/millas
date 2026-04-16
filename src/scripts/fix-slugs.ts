/**
 * Fix produtos com slugs inválidos (nulo, vazio, ou com caracteres não-URL-safe).
 * Uso:
 *   npx tsx src/scripts/fix-slugs.ts            (aplica fixes)
 *   npx tsx src/scripts/fix-slugs.ts --dry-run  (só mostra o que seria alterado)
 */

import * as dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, or, isNull, sql } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

dotenv.config({ path: '.env.local' })

const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT ?? '3306'),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
})

const db = drizzle(pool, { schema, mode: 'default' })

const isDryRun = process.argv.includes('--dry-run')

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function isValidSlug(slug: string | null): boolean {
  if (!slug || slug.trim() === '') return false
  return /^[a-z0-9-]+$/.test(slug)
}

async function main() {
  console.log(isDryRun ? '🔍 DRY RUN — nenhuma alteração será feita\n' : '🔧 Corrigindo slugs...\n')

  // Busca todos os produtos ativos
  const all = await db
    .select({ id: schema.products.id, nome: schema.products.nome, slug: schema.products.slug, ativo: schema.products.ativo })
    .from(schema.products)

  // Carrega slugs existentes para detectar conflitos
  const existingSlugs = new Set(all.map(p => p.slug).filter(Boolean))

  const problematic = all.filter(p => !isValidSlug(p.slug))

  if (problematic.length === 0) {
    console.log('✅ Nenhum produto com slug inválido encontrado.')
    await pool.end()
    return
  }

  console.log(`⚠ ${problematic.length} produtos com slug inválido encontrados:\n`)

  let fixed = 0
  for (const p of problematic) {
    const base = slugify(p.nome)
    if (!base) {
      console.log(`  SKIP id=${p.id} nome="${p.nome}" → não foi possível gerar slug`)
      continue
    }

    let candidate = base
    let i = 2
    while (existingSlugs.has(candidate) && candidate !== p.slug) {
      candidate = `${base}-${i++}`
    }

    console.log(`  id=${p.id} | slug atual: "${p.slug ?? 'NULL'}" → novo: "${candidate}"`)

    if (!isDryRun) {
      await db.update(schema.products).set({ slug: candidate }).where(eq(schema.products.id, p.id))
      existingSlugs.delete(p.slug ?? '')
      existingSlugs.add(candidate)
    }
    fixed++
  }

  console.log(`\n${isDryRun ? `🔍 ${fixed} slugs seriam corrigidos.` : `✅ ${fixed} slugs corrigidos.`}`)
  await pool.end()
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
