/**
 * Re-baixa imagens de produtos que estão sem imagem no banco.
 * Consulta WooCommerce API para cada produto com wooId e imagens=[].
 *
 * Uso:
 *   npx tsx src/scripts/fix-missing-images.ts            (baixa imagens)
 *   npx tsx src/scripts/fix-missing-images.ts --dry-run  (só lista produtos sem imagem)
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, and, isNotNull } from 'drizzle-orm'
import pLimit from 'p-limit'
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

const WOO_URL = process.env.WOOCOMMERCE_URL!
const WOO_KEY = process.env.WOOCOMMERCE_KEY!
const WOO_SECRET = process.env.WOOCOMMERCE_SECRET!
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'produtos')
const CONCURRENCY = 3
const isDryRun = process.argv.includes('--dry-run')

function parseImagens(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[]
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

async function downloadImage(imageUrl: string, wooId: string, index: number): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const dir = path.join(UPLOADS_DIR, String(wooId))
    const fileName = `${index}.${ext}`
    const filePath = path.join(dir, fileName)
    fs.mkdirSync(dir, { recursive: true })
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(filePath, buffer)
    return `/uploads/produtos/${wooId}/${fileName}`
  } catch {
    return null
  }
}

async function fetchWooProduct(wooId: string): Promise<{ images: Array<{ src: string }> } | null> {
  const auth = Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString('base64')
  try {
    const res = await fetch(`${WOO_URL}/wp-json/wc/v3/products/${wooId}`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function main() {
  console.log(isDryRun ? '🔍 DRY RUN\n' : '📥 Baixando imagens faltantes...\n')

  // Busca produtos ativos sem imagens (ou imagens vazias) que têm wooId
  const todos = await db
    .select({ id: schema.products.id, nome: schema.products.nome, wooId: schema.products.wooId, imagens: schema.products.imagens })
    .from(schema.products)
    .where(and(eq(schema.products.ativo, true), isNotNull(schema.products.wooId)))

  const semImagem = todos.filter(p => {
    const imgs = parseImagens(p.imagens)
    return imgs.length === 0
  })

  console.log(`📊 Total ativos com wooId: ${todos.length}`)
  console.log(`⚠ Sem imagem: ${semImagem.length}\n`)

  if (semImagem.length === 0) {
    console.log('✅ Todos os produtos já têm imagens.')
    await pool.end()
    return
  }

  if (isDryRun) {
    console.log('Produtos sem imagem:')
    for (const p of semImagem.slice(0, 50)) {
      console.log(`  id=${p.id} wooId=${p.wooId} "${p.nome}"`)
    }
    if (semImagem.length > 50) console.log(`  ... e mais ${semImagem.length - 50}`)
    await pool.end()
    return
  }

  const limit = pLimit(CONCURRENCY)
  let baixados = 0
  let erros = 0

  await Promise.all(semImagem.map(p => limit(async () => {
    const woo = await fetchWooProduct(p.wooId!)
    if (!woo || !woo.images?.length) {
      console.log(`  ✗ id=${p.id} (wooId=${p.wooId}) — sem imagens no WooCommerce`)
      erros++
      return
    }

    const urls: string[] = []
    for (let i = 0; i < Math.min(woo.images.length, 5); i++) {
      const local = await downloadImage(woo.images[i].src, p.wooId!, i)
      if (local) urls.push(local)
    }

    if (urls.length > 0) {
      await db.update(schema.products)
        .set({ imagens: JSON.stringify(urls) as any })
        .where(eq(schema.products.id, p.id))
      console.log(`  ✓ id=${p.id} "${p.nome}" — ${urls.length} imagem(ns) baixada(s)`)
      baixados++
    } else {
      console.log(`  ✗ id=${p.id} "${p.nome}" — falha no download`)
      erros++
    }
  })))

  console.log(`\n✅ Concluído: ${baixados} produtos com imagens novas, ${erros} erros.`)
  await pool.end()
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
