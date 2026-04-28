export const dynamic = 'force-dynamic'

import React from 'react'
import Link from 'next/link'
import ProductCard from '@/components/loja/ProductCard'
import { listProducts, PER_PAGE } from '@/lib/db/queries/products'
import { listCategories } from '@/lib/db/queries/categories'

interface ProdutosPageProps {
  searchParams: Promise<{ categoria?: string; q?: string; preco_max?: string; pagina?: string }>
}

// ── Tree helpers ───────────────────────────────────────────────────────────

type CatRow = Awaited<ReturnType<typeof listCategories>>[number]

interface CatNode extends CatRow {
  children: CatNode[]
}

function buildCatTree(cats: CatRow[]): CatNode[] {
  const map = new Map<number, CatNode>()
  for (const c of cats) map.set(c.id, { ...c, children: [] })

  const roots: CatNode[] = []
  for (const node of map.values()) {
    if (node.parentId == null) {
      roots.push(node)
    } else {
      const parent = map.get(node.parentId)
      if (parent) parent.children.push(node)
      else roots.push(node) // orphan → treat as root
    }
  }

  function sort(nodes: CatNode[]) {
    nodes.sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome, 'pt-BR'))
    for (const n of nodes) sort(n.children)
  }
  sort(roots)
  return roots
}

function containsActive(node: CatNode, slug: string): boolean {
  if (node.slug === slug) return true
  return node.children.some(c => containsActive(c, slug))
}

function renderCatNodes(nodes: CatNode[], active: string, depth: number): React.ReactElement[] {
  const indent = 12 + depth * 14

  return nodes.map(node => {
    const isActive = active === node.slug
    const inBranch = containsActive(node, active)
    const hasKids = node.children.length > 0

    const linkCls = `flex items-center gap-2 rounded-xl text-sm font-medium transition-colors py-2 pr-3 ${
      isActive
        ? 'bg-primary text-on-primary font-bold'
        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
    }`

    if (!hasKids) {
      return (
        <Link
          key={node.id}
          href={`/produtos?categoria=${node.slug}`}
          className={linkCls}
          style={{ paddingLeft: indent + 'px' }}
        >
          <span className="shrink-0">{categoryEmoji(node.nome)}</span>
          <span className="truncate leading-snug">{node.nome}</span>
        </Link>
      )
    }

    return (
      <details key={node.id} open={inBranch}>
        <summary
          className="list-none flex items-center gap-2 rounded-xl cursor-pointer select-none transition-colors py-2 pr-2 hover:bg-surface-container"
          style={{ paddingLeft: indent + 'px' }}
        >
          <span className="shrink-0">{categoryEmoji(node.nome)}</span>
          <Link
            href={`/produtos?categoria=${node.slug}`}
            className={`flex-1 text-sm font-medium truncate leading-snug ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
          >
            {node.nome}
          </Link>
          <span className="text-[10px] text-outline-variant shrink-0 ml-1">▾</span>
        </summary>
        <div className="flex flex-col gap-0.5 mt-0.5">
          {renderCatNodes(node.children, active, depth + 1)}
        </div>
      </details>
    )
  })
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function ProdutosPage({ searchParams }: ProdutosPageProps) {
  const params = await searchParams
  const categoriaAtiva = params.categoria ?? ''
  const busca = params.q ?? ''
  const precoMax = params.preco_max ? parseFloat(params.preco_max) : undefined
  const paginaAtual = parseInt(params.pagina ?? '1')

  const [{ produtos, total, paginas }, categorias] = await Promise.all([
    listProducts({ categoriaSlug: categoriaAtiva || undefined, busca: busca || undefined, precoMax, pagina: paginaAtual }),
    listCategories(),
  ])

  const catTree = buildCatTree(categorias)
  const rootCats = catTree // for mobile chips

  const categoriaLabel = categoriaAtiva
    ? categorias.find(c => c.slug === categoriaAtiva)?.nome ?? 'Produtos'
    : busca
    ? `Resultados para "${busca}"`
    : 'Todos os Produtos'

  function pageUrl(p: number) {
    const q = new URLSearchParams()
    if (categoriaAtiva) q.set('categoria', categoriaAtiva)
    if (busca) q.set('q', busca)
    if (precoMax) q.set('preco_max', String(precoMax))
    if (p > 1) q.set('pagina', String(p))
    return `/produtos${q.toString() ? `?${q}` : ''}`
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex gap-8">
        {/* ── Sidebar ── */}
        <aside className="hidden md:flex flex-col gap-6 w-56 shrink-0">
          <div className="sticky top-28">
            <h2 className="font-headline font-bold text-lg text-primary mb-4">Categorias</h2>
            <nav className="flex flex-col gap-0.5">
              {/* Todos */}
              <Link
                href="/produtos"
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  !categoriaAtiva
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span>🛒</span>
                Todos
              </Link>

              {renderCatNodes(catTree, categoriaAtiva, 0)}
            </nav>

            {/* Filtro de preço */}
            <div className="mt-6 pt-6 border-t border-outline-variant/20">
              <h3 className="font-headline font-bold text-sm text-on-surface mb-3">Preço máximo</h3>
              <div className="flex flex-col gap-1.5">
                {[20, 50, 100, 200].map((max) => (
                  <Link
                    key={max}
                    href={`/produtos?${categoriaAtiva ? `categoria=${categoriaAtiva}&` : ''}preco_max=${max}`}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      params.preco_max === String(max)
                        ? 'bg-secondary-container text-on-secondary-fixed font-bold'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Até R$ {max},00
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Grid ── */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <div>
              <h1 className="text-2xl md:text-4xl font-headline font-extrabold text-on-surface">
                {categoriaLabel}
              </h1>
              <p className="text-on-surface-variant text-sm mt-1">
                {total} produto{total !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Categorias mobile — mostra só raízes */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
              <Link
                href="/produtos"
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${
                  !categoriaAtiva ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'
                }`}
              >
                Todos
              </Link>
              {rootCats.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/produtos?categoria=${cat.slug}`}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${
                    categoriaAtiva === cat.slug || containsActive(cat, categoriaAtiva)
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface'
                  }`}
                >
                  {categoryEmoji(cat.nome)} {cat.nome}
                </Link>
              ))}
            </div>
          </div>

          {produtos.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <span className="material-symbols-outlined text-6xl text-outline-variant">search_off</span>
              <h3 className="font-headline font-bold text-xl text-on-surface">Nenhum produto encontrado</h3>
              <p className="text-on-surface-variant">Tente uma busca diferente ou explore outras categorias.</p>
              <Link href="/produtos" className="btn-primary-gradient text-on-primary px-6 py-2.5 rounded-full font-bold text-sm mt-2">
                Ver todos os produtos
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {produtos.map((p) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    nome={p.nome}
                    slug={p.slug}
                    preco={p.preco}
                    precoDe={p.precoDe}
                    imagens={p.imagens}
                    isKg={p.isKg}
                    badge={p.precoDe ? 'Oferta' : undefined}
                  />
                ))}
              </div>

              {paginas > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  {paginaAtual > 1 && (
                    <Link href={pageUrl(paginaAtual - 1)} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium hover:bg-surface-container-high transition-colors">
                      ← Anterior
                    </Link>
                  )}
                  {Array.from({ length: Math.min(paginas, 7) }, (_, i) => {
                    const p = paginaAtual <= 4 ? i + 1 : paginaAtual - 3 + i
                    if (p < 1 || p > paginas) return null
                    return (
                      <Link
                        key={p}
                        href={pageUrl(p)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                          p === paginaAtual
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  })}
                  {paginaAtual < paginas && (
                    <Link href={pageUrl(paginaAtual + 1)} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium hover:bg-surface-container-high transition-colors">
                      Próxima →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function categoryEmoji(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('bebida'))           return '🥤'
  if (n.includes('perecív') || n.includes('frios') || n.includes('laticín')) return '🧀'
  if (n.includes('carne') || n.includes('aves') || n.includes('peixe'))      return '🥩'
  if (n.includes('hortifruti') || n.includes('fruta') || n.includes('verdur')) return '🥦'
  if (n.includes('limpeza'))          return '🧹'
  if (n.includes('higiene') || n.includes('perfum')) return '🧴'
  if (n.includes('padaria') || n.includes('biscoito') || n.includes('seca doce')) return '🍞'
  if (n.includes('seca salgada') || n.includes('salgad')) return '🥫'
  if (n.includes('bazar'))            return '🏪'
  if (n.includes('açougue'))          return '🥩'
  if (n.includes('congelado') || n.includes('gelado')) return '🧊'
  if (n.includes('cereal') || n.includes('matinal')) return '🥣'
  if (n.includes('pet') || n.includes('animal')) return '🐾'
  return '📦'
}
