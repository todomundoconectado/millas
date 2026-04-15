import { db } from '@/lib/db'
import { productAffinities, products } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { listRelated } from './products'

/**
 * Retorna até `limit` produtos recomendados com base em co-compras.
 * Fallback: mesma categoria se não houver afinidades calculadas.
 */
export async function getRecommendations(productId: number, categoriaId: number | null, limit = 4) {
  const affinities = await db
    .select({
      affineProductId: productAffinities.affineProductId,
      score: productAffinities.score,
      id: products.id,
      nome: products.nome,
      slug: products.slug,
      preco: products.preco,
      precoDe: products.precoDe,
      imagens: products.imagens,
      isKg: products.isKg,
      estoque: products.estoque,
      ativo: products.ativo,
      categoriaId: products.categoriaId,
      wooId: products.wooId,
      sku: products.sku,
      descricao: products.descricao,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(productAffinities)
    .innerJoin(products, eq(productAffinities.affineProductId, products.id))
    .where(
      and(
        eq(productAffinities.productId, productId),
        eq(products.ativo, true)
      )
    )
    .orderBy(desc(productAffinities.score))
    .limit(limit)

  if (affinities.length >= limit) {
    return affinities
  }

  // Fallback: complementar com produtos da mesma categoria
  const fallback = await listRelated(categoriaId, productId, limit)
  const affinityIds = new Set(affinities.map(a => a.id))
  const extra = fallback.filter(p => !affinityIds.has(p.id))
  return [...affinities, ...extra].slice(0, limit)
}
