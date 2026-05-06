import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq, isNotNull, or, sql } from 'drizzle-orm'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { extname } from 'path'

function parseImagens(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[]
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

function err2str(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

async function checkAuth(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  const header = request.headers.get('x-cron-secret')
  if (cronSecret && header === cronSecret) return true
  const session = await auth()
  return !!session
}

// GET — estatísticas (produtos com woo_id sem imagem)
export async function GET(request: NextRequest) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [totalWoo] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(isNotNull(products.wooId))

  const [semImagem] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(sql`${products.wooId} IS NOT NULL AND (${products.imagens} IS NULL OR JSON_LENGTH(${products.imagens}) = 0)`)

  return NextResponse.json({
    totalWoo: Number(totalWoo.n),
    semImagem: Number(semImagem.n),
    comImagem: Number(totalWoo.n) - Number(semImagem.n),
  })
}

export async function POST(request: NextRequest) {
  try {
    if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const {
      page = 1,
      perPage = 8,
      somenteSemImagem = true,
      wooUrl = process.env.WOOCOMMERCE_URL,
      ck = process.env.WOOCOMMERCE_KEY,
      cs = process.env.WOOCOMMERCE_SECRET,
    } = body

    if (!wooUrl || !ck || !cs) {
      return NextResponse.json({ error: 'Credenciais WooCommerce não configuradas' }, { status: 400 })
    }

    const basicAuth = Buffer.from(`${ck}:${cs}`).toString('base64')
    const baseUrl = wooUrl.replace(/\/$/, '')
    const apiUrl = `${baseUrl}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=any`

    // ── Fetch WooCommerce ──────────────────────────────────────────────────
    let wooRes: Response
    try {
      wooRes = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: 'application/json',
        },
        redirect: 'follow',
      })
    } catch (e) {
      return NextResponse.json({ error: `Conexão falhou: ${err2str(e)}` }, { status: 500 })
    }

    const rawText = await wooRes.text()
    const contentType = wooRes.headers.get('content-type') ?? ''
    const finalUrl = wooRes.url // URL after redirects

    if (!contentType.includes('json')) {
      return NextResponse.json({
        error: `WooCommerce retornou content-type "${contentType}" (esperado JSON). Status: ${wooRes.status}. URL final: ${finalUrl}. Início: ${rawText.slice(0, 400)}`,
      }, { status: 500 })
    }

    if (!wooRes.ok) {
      return NextResponse.json({
        error: `WooCommerce retornou ${wooRes.status}. Body: ${rawText.slice(0, 300)}`,
      }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wooProducts: any[]
    try {
      const parsed = JSON.parse(rawText)
      wooProducts = Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return NextResponse.json({
        error: `Falha ao parsear JSON: ${err2str(e)}. Início: ${rawText.slice(0, 300)}`,
      }, { status: 500 })
    }

    const totalProducts = parseInt(wooRes.headers.get('X-WP-Total') || '0')
    const totalPages = parseInt(wooRes.headers.get('X-WP-TotalPages') || '1')

    // Debug mode: return raw first product
    const { debug } = body
    if (debug) {
      const sample = wooProducts.slice(0, 2).map((p: { id: unknown; name: unknown; slug: unknown; images: unknown }) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        images: p.images,
      }))
      return NextResponse.json({ debug: true, total: totalProducts, sample })
    }

    let imported = 0
    let skipped = 0
    let skippedJaTemImagem = 0
    let noMatch = 0
    const errors: string[] = []

    for (const wooProd of wooProducts) {
      if (!wooProd.images || wooProd.images.length === 0) {
        skipped++
        continue
      }

      // Match by woo_id first, then slug, then normalized name
      const wooSlug = wooProd.slug ?? ''
      const wooName = (wooProd.name ?? '').trim()

      const [dbProd] = await db
        .select({ id: products.id, imagens: products.imagens })
        .from(products)
        .where(
          or(
            eq(products.wooId, String(wooProd.id)),
            wooSlug ? eq(products.slug, wooSlug) : undefined,
          )
        )
        .limit(1)

      // Fallback: match by name if slug didn't work
      let matched = dbProd
      if (!matched && wooName) {
        const [byName] = await db
          .select({ id: products.id, imagens: products.imagens })
          .from(products)
          .where(eq(products.nome, wooName))
          .limit(1)
        matched = byName
      }

      if (!matched) {
        noMatch++
        continue
      }

      const dbProdFinal = matched

      const current = parseImagens(dbProdFinal.imagens)
      if (somenteSemImagem && current.length > 0) {
        skippedJaTemImagem++
        continue
      }

      const newUrls: string[] = []
      for (const wooImg of wooProd.images.slice(0, 4)) {
        try {
          const imgRes = await fetch(wooImg.src, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          })
          if (!imgRes.ok) {
            errors.push(`HTTP ${imgRes.status} ao baixar: ${wooImg.src.slice(0, 100)}`)
            continue
          }

          const buffer = Buffer.from(await imgRes.arrayBuffer())

          const srcExt = extname(wooImg.src.split('?')[0]) || '.jpg'
          const filename = `${Date.now()}-${Math.floor(Math.random() * 9999)}${srcExt}`
          const dir = path.join(process.cwd(), 'public', 'uploads', 'produtos', String(dbProdFinal.id))
          await mkdir(dir, { recursive: true })
          await writeFile(path.join(dir, filename), buffer)

          newUrls.push(`/uploads/produtos/${dbProdFinal.id}/${filename}`)
          await new Promise(r => setTimeout(r, 80))
        } catch (e) {
          errors.push(`woo#${wooProd.id}: ${err2str(e)}`)
        }
      }

      if (newUrls.length > 0) {
        await db.update(products).set({ imagens: newUrls }).where(eq(products.id, dbProdFinal.id))
        imported++
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      page,
      totalPages,
      totalProducts,
      processed: wooProducts.length,
      imported,
      skipped,
      skippedJaTemImagem,
      noMatch,
      errors,
      done: page >= totalPages,
    })
  } catch (e) {
    // Safety net — always return JSON
    return NextResponse.json({ error: `Erro interno: ${err2str(e)}` }, { status: 500 })
  }
}
