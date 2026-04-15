import { db } from '@/lib/db'
import { products, categories } from '@/lib/db/schema'
import { eq, and, like, isNotNull, desc, sql, inArray } from 'drizzle-orm'

export const PER_PAGE = 24

/**
 * Normaliza o campo `imagens` que pode vir do mysql2 como string JSON ou array.
 * O driver mysql2 no Hostinger não faz typeCast automático de colunas JSON.
 */
function parseImagens(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[]
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

/** BFS: retorna todos os IDs descendentes de uma categoria (inclusive ela mesma) */
async function collectCategoryIds(slug: string): Promise<number[]> {
  const allCats = await db.select({ id: categories.id, slug: categories.slug, parentId: categories.parentId }).from(categories)
  const root = allCats.find(c => c.slug === slug)
  if (!root) return []

  const ids: number[] = []
  const queue = [root.id]
  while (queue.length) {
    const current = queue.shift()!
    ids.push(current)
    for (const c of allCats) {
      if (c.parentId === current) queue.push(c.id)
    }
  }
  return ids
}

export async function listProducts(opts: {
  categoriaSlug?: string
  busca?: string
  precoMax?: number
  pagina?: number
}) {
  const { categoriaSlug, busca, precoMax, pagina = 1 } = opts

  // Resolver categoria → IDs (pai + todos os filhos via BFS)
  let categoriaIds: number[] = []
  if (categoriaSlug) {
    categoriaIds = await collectCategoryIds(categoriaSlug)
  }

  const conditions = [eq(products.ativo, true)]
  if (categoriaIds.length === 1) conditions.push(eq(products.categoriaId, categoriaIds[0]))
  else if (categoriaIds.length > 1) conditions.push(inArray(products.categoriaId, categoriaIds))
  if (busca)    conditions.push(like(products.nome, `%${busca}%`))
  if (precoMax) conditions.push(sql`CAST(${products.preco} AS DECIMAL) <= ${precoMax}`)

  const where = and(...conditions)

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(products)
    .where(where)

  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(PER_PAGE)
    .offset((pagina - 1) * PER_PAGE)

  return {
    produtos: rows.map(r => ({ ...r, imagens: parseImagens(r.imagens) })),
    total: Number(total),
    paginas: Math.ceil(Number(total) / PER_PAGE),
  }
}

export async function getProductBySlug(slug: string) {
  const [produto] = await db
    .select({
      id: products.id,
      nome: products.nome,
      slug: products.slug,
      descricao: products.descricao,
      preco: products.preco,
      precoDe: products.precoDe,
      imagens: products.imagens,
      isKg: products.isKg,
      estoque: products.estoque,
      ativo: products.ativo,
      categoriaId: products.categoriaId,
      categoriaSlug: categories.slug,
      categoriaNome: categories.nome,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoriaId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1)

  console.log('[getProductBySlug]', slug, '→', produto ? 'found' : 'null')
  if (!produto) return null
  return { ...produto, imagens: parseImagens(produto.imagens) }
}

export async function listOffers(limit = 8) {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.ativo, true), isNotNull(products.precoDe)))
    .orderBy(desc(products.createdAt))
    .limit(limit)
  return rows.map(r => ({ ...r, imagens: parseImagens(r.imagens) }))
}

export async function listRelated(categoriaId: number | null, excludeId: number, limit = 4) {
  if (!categoriaId) return []
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.ativo, true),
        eq(products.categoriaId, categoriaId),
        sql`${products.id} != ${excludeId}`
      )
    )
    .orderBy(desc(products.createdAt))
    .limit(limit)
  return rows.map(r => ({ ...r, imagens: parseImagens(r.imagens) }))
}

export type ProductRow = typeof products.$inferSelect
