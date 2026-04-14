import { db } from '@/lib/db'
import { products, categories } from '@/lib/db/schema'
import { eq, and, like, lte, isNotNull, desc, sql } from 'drizzle-orm'

export const PER_PAGE = 24

export async function listProducts(opts: {
  categoriaSlug?: string
  busca?: string
  precoMax?: number
  pagina?: number
}) {
  const { categoriaSlug, busca, precoMax, pagina = 1 } = opts

  // Resolver categoria → id
  let categoriaId: number | undefined
  if (categoriaSlug) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categoriaSlug))
      .limit(1)
    if (cat) categoriaId = cat.id
  }

  const conditions = [eq(products.ativo, true)]
  if (categoriaId)  conditions.push(eq(products.categoriaId, categoriaId))
  if (busca)        conditions.push(like(products.nome, `%${busca}%`))
  if (precoMax)     conditions.push(sql`CAST(${products.preco} AS DECIMAL) <= ${precoMax}`)

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
    produtos: rows,
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
    .where(and(eq(products.slug, slug), eq(products.ativo, true)))
    .limit(1)

  return produto ?? null
}

export async function listOffers(limit = 8) {
  return db
    .select()
    .from(products)
    .where(and(eq(products.ativo, true), isNotNull(products.precoDe)))
    .orderBy(desc(products.createdAt))
    .limit(limit)
}

export async function listRelated(categoriaId: number | null, excludeId: number, limit = 4) {
  if (!categoriaId) return []
  return db
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
}

export type ProductRow = typeof products.$inferSelect
