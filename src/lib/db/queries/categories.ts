import { db } from '@/lib/db'
import { categories, products } from '@/lib/db/schema'
import { eq, asc, isNotNull, and } from 'drizzle-orm'

// ── Tipos ──────────────────────────────────────────────────────────────────

type RawCat = { id: number; nome: string; slug: string; parentId: number | null; ordem: number; ativo: boolean; imagemUrl: string | null; mobneId: string | null; createdAt: Date }

interface CatNode extends RawCat {
  children: CatNode[]
}

// ── Helpers internos ───────────────────────────────────────────────────────

function buildTree(cats: RawCat[]): CatNode[] {
  const map = new Map<number, CatNode>()
  for (const c of cats) map.set(c.id, { ...c, children: [] })

  const roots: CatNode[] = []
  for (const node of map.values()) {
    if (node.parentId == null) roots.push(node)
    else {
      const parent = map.get(node.parentId)
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
  }
  return roots
}

// Retorna true se o nó ou qualquer descendente tem ID no set
function nodeHasProducts(node: CatNode, catIds: Set<number>): boolean {
  if (catIds.has(node.id)) return true
  return node.children.some(c => nodeHasProducts(c, catIds))
}

// Poda a árvore: remove nós sem produtos em nenhum descendente
function pruneTree(nodes: CatNode[], catIds: Set<number>): CatNode[] {
  const result: CatNode[] = []
  for (const node of nodes) {
    const prunedChildren = pruneTree(node.children, catIds)
    if (catIds.has(node.id) || prunedChildren.length > 0) {
      result.push({ ...node, children: prunedChildren })
    }
  }
  return result
}

function flattenTree(nodes: CatNode[]): RawCat[] {
  const result: RawCat[] = []
  for (const n of nodes) {
    result.push(n)
    result.push(...flattenTree(n.children))
  }
  return result
}

// ── Export principal ───────────────────────────────────────────────────────

/**
 * Retorna todas as categorias ativas que têm ao menos 1 produto ativo
 * (considerando a hierarquia — uma categoria pai aparece se qualquer
 * descendente tiver produto).
 */
export async function listCategories() {
  const [allCats, productCatRows] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.ativo, true))
      .orderBy(asc(categories.ordem), asc(categories.nome)),
    db
      .selectDistinct({ categoriaId: products.categoriaId })
      .from(products)
      .where(and(eq(products.ativo, true), isNotNull(products.categoriaId))),
  ])

  const catIdsWithProducts = new Set(
    productCatRows.map(r => r.categoriaId).filter((id): id is number => id != null),
  )

  const tree = buildTree(allCats)
  const pruned = pruneTree(tree, catIdsWithProducts)
  return flattenTree(pruned)
}

export type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number]
