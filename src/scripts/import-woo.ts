/**
 * Script de Importação WooCommerce → MariaDB
 *
 * Uso:
 *   npx tsx src/scripts/import-woo.ts
 *   npx tsx src/scripts/import-woo.ts --limit 100   (teste com 100 produtos)
 *   npx tsx src/scripts/import-woo.ts --resume       (continuar de checkpoint)
 *
 * Imagens são baixadas para: public/uploads/produtos/{wooId}/
 * Servidas em: /uploads/produtos/{wooId}/0.jpg
 *
 * Variáveis de ambiente necessárias (.env.local):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *   WOOCOMMERCE_URL  (ex: https://loja.supermillas.com.br)
 *   WOOCOMMERCE_KEY
 *   WOOCOMMERCE_SECRET
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import pLimit from 'p-limit'
import * as schema from '../lib/db/schema'

dotenv.config({ path: '.env.local' })

// ── Configuração ───────────────────────────────────────────────────────────

const WOO_URL = process.env.WOOCOMMERCE_URL!
const WOO_KEY = process.env.WOOCOMMERCE_KEY!
const WOO_SECRET = process.env.WOOCOMMERCE_SECRET!

const CHECKPOINT_FILE = '.woo-import-checkpoint.json'
const CONCURRENCY = 5
const PER_PAGE = 100
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'produtos')

// ── Args ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined
const resume = args.includes('--resume')

// ── Tipos WooCommerce ──────────────────────────────────────────────────────

interface WooImage { src: string; alt?: string }
interface WooCategory { id: number; name: string; slug: string; parent: number }
interface WooProduct {
  id: number
  name: string
  slug: string
  description: string
  short_description: string
  sku: string
  price: string
  regular_price: string
  sale_price: string
  status: string
  categories: WooCategory[]
  images: WooImage[]
  manage_stock: boolean
  stock_quantity: number | null
  meta_data: Array<{ key: string; value: string }>
}

// ── DB ─────────────────────────────────────────────────────────────────────

const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT ?? '3306'),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  connectionLimit: 10,
  waitForConnections: true,
})

const db = drizzle(pool, { schema, mode: 'default' })

// ── Checkpoint ─────────────────────────────────────────────────────────────

interface Checkpoint { lastPage: number; imported: number; errors: number }

function loadCheckpoint(): Checkpoint {
  if (resume && fs.existsSync(CHECKPOINT_FILE)) {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'))
    console.log(`📂 Retomando do checkpoint: página ${data.lastPage}, ${data.imported} produtos importados`)
    return data
  }
  return { lastPage: 1, imported: 0, errors: 0 }
}

function saveCheckpoint(cp: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2))
}

// ── Slugify ────────────────────────────────────────────────────────────────

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

// ── Download de imagem ─────────────────────────────────────────────────────

async function downloadImage(imageUrl: string, wooId: number, index: number): Promise<string | null> {
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

// ── Upsert de categoria ────────────────────────────────────────────────────

const categoryCache = new Map<number, number>() // woo_id → db_id

async function upsertCategory(wooCategory: WooCategory): Promise<number> {
  const cached = categoryCache.get(wooCategory.id)
  if (cached) return cached

  const slug = wooCategory.slug || slugify(wooCategory.name)

  const existing = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(eq(schema.categories.slug, slug))
    .limit(1)

  if (existing[0]) {
    categoryCache.set(wooCategory.id, existing[0].id)
    return existing[0].id
  }

  const result = await db.insert(schema.categories).values({
    nome: wooCategory.name,
    slug,
    parentId: null,
    ativo: true,
  })

  const id = Number(result[0].insertId)
  categoryCache.set(wooCategory.id, id)
  return id
}

// ── Importar produto ───────────────────────────────────────────────────────

const limiter = pLimit(CONCURRENCY)

async function importProduct(wooProduct: WooProduct): Promise<boolean> {
  try {
    // Idempotente: pular se já importado
    const existing = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.wooId, String(wooProduct.id)))
      .limit(1)

    if (existing[0]) return true

    // Categoria
    let categoriaId: number | null = null
    if (wooProduct.categories.length > 0) {
      categoriaId = await upsertCategory(wooProduct.categories[0])
    }

    // Download de imagens em paralelo
    const imageUrls: string[] = []
    if (wooProduct.images.length > 0) {
      const tasks = wooProduct.images.slice(0, 5).map((img, idx) =>
        limiter(() => downloadImage(img.src, wooProduct.id, idx))
      )
      const results = await Promise.all(tasks)
      imageUrls.push(...results.filter((url): url is string => url !== null))
    }

    // Detectar produto por kg
    const isKg =
      wooProduct.name.toLowerCase().includes('kg') ||
      wooProduct.name.toLowerCase().includes('quilo') ||
      wooProduct.meta_data?.some(m => m.key === '_sold_by_weight' && m.value === 'yes') ||
      false

    // Preços: se tem sale_price, é o preço atual; regular_price vira precoDe
    const precoAtual = wooProduct.sale_price || wooProduct.price || wooProduct.regular_price || '0'
    const precoDe =
      wooProduct.sale_price &&
      wooProduct.regular_price &&
      wooProduct.sale_price !== wooProduct.regular_price
        ? wooProduct.regular_price
        : null

    // Slug único
    let slug = wooProduct.slug || slugify(wooProduct.name)
    const slugCheck = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, slug))
      .limit(1)
    if (slugCheck[0]) slug = `${slug}-${wooProduct.id}`

    await db.insert(schema.products).values({
      nome: wooProduct.name,
      slug,
      descricao: wooProduct.description || wooProduct.short_description || null,
      preco: precoAtual,
      precoDe,
      sku: wooProduct.sku || null,
      categoriaId,
      imagens: imageUrls,
      isKg,
      estoque: wooProduct.stock_quantity != null ? String(wooProduct.stock_quantity) : '999',
      ativo: wooProduct.status === 'publish',
      wooId: String(wooProduct.id),
    })

    return true
  } catch (err) {
    console.error(`  ❌ Erro ao importar produto ${wooProduct.id} "${wooProduct.name}": ${err}`)
    return false
  }
}

// ── Fetch WooCommerce API ──────────────────────────────────────────────────

async function fetchWooPage(page: number): Promise<{ products: WooProduct[]; total: number }> {
  const auth = Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString('base64')
  const url = `${WOO_URL}/wp-json/wc/v3/products?per_page=${PER_PAGE}&page=${page}&status=publish`

  const response = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    throw new Error(`WooCommerce API erro: ${response.status} ${response.statusText}`)
  }

  const total = parseInt(response.headers.get('X-WP-Total') || '0')
  const products = await response.json() as WooProduct[]
  return { products, total }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🛒 Super Millas — Importação WooCommerce → MariaDB\n')

  const missingVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'WOOCOMMERCE_URL', 'WOOCOMMERCE_KEY', 'WOOCOMMERCE_SECRET']
    .filter(key => !process.env[key])

  if (missingVars.length > 0) {
    console.error(`❌ Variáveis de ambiente ausentes: ${missingVars.join(', ')}`)
    process.exit(1)
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true })

  const cp = loadCheckpoint()
  let { imported, errors } = cp

  console.log('🔍 Conectando à API do WooCommerce...')
  const firstPage = await fetchWooPage(1)
  const totalProducts = limitArg ? Math.min(limitArg, firstPage.total) : firstPage.total
  const totalPages = Math.ceil(totalProducts / PER_PAGE)

  console.log(`📦 Total de produtos: ${firstPage.total}`)
  if (limitArg) console.log(`   (limitado a ${limitArg} para teste)`)
  console.log(`📄 Páginas: ${totalPages}\n`)

  const startPage = resume ? cp.lastPage : 1

  for (let page = startPage; page <= totalPages; page++) {
    const { products: wooProducts } = page === 1 ? firstPage : await fetchWooPage(page)

    console.log(`\n📄 Página ${page}/${totalPages} (${wooProducts.length} produtos)`)

    for (const product of wooProducts) {
      if (limitArg && imported >= limitArg) break
      process.stdout.write(`  [${imported + 1}/${totalProducts}] ${product.name.substring(0, 50).padEnd(50)}... `)
      const success = await importProduct(product)
      if (success) { imported++; process.stdout.write('✓\n') }
      else { errors++; process.stdout.write('✗\n') }
    }

    saveCheckpoint({ lastPage: page, imported, errors })

    if (limitArg && imported >= limitArg) break
  }

  console.log('\n─────────────────────────────────────')
  console.log(`✅ Importação concluída!`)
  console.log(`   Importados: ${imported}`)
  console.log(`   Erros:      ${errors}`)
  console.log(`   Imagens em: public/uploads/produtos/`)

  if (errors === 0 && fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE)
  }

  await pool.end()
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
