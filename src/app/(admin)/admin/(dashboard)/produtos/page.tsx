export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { products, categories } from '@/lib/db/schema'
import { eq, and, like, sql, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import ProductsTable from './ProductsTable'

const PER_PAGE = 50

interface Props {
  searchParams: Promise<{ q?: string; pagina?: string; ativo?: string; semImagem?: string }>
}

async function updateProductPrice(id: number, preco: string) {
  'use server'
  await db.update(products).set({ preco }).where(eq(products.id, id))
  revalidatePath('/admin/produtos')
}

async function bulkToggleAtivo(ids: number[], ativo: boolean) {
  'use server'
  if (!ids.length) return
  for (const id of ids) {
    await db.update(products).set({ ativo }).where(eq(products.id, id))
  }
  revalidatePath('/admin/produtos')
}

export default async function AdminProdutos({ searchParams }: Props) {
  const params = await searchParams
  const busca = params.q ?? ''
  const pagina = parseInt(params.pagina ?? '1')
  const filtroAtivo = params.ativo
  const filtroSemImagem = params.semImagem === 'true'

  const conditions = []
  if (busca) conditions.push(like(products.nome, `%${busca}%`))
  if (filtroAtivo === 'true') conditions.push(eq(products.ativo, true))
  if (filtroAtivo === 'false') conditions.push(eq(products.ativo, false))
  if (filtroSemImagem) conditions.push(sql`JSON_LENGTH(${products.imagens}) = 0`)

  const where = conditions.length ? and(...conditions) : undefined

  // Count total sem imagem para badge informativo
  const [{ semImagem }] = await db
    .select({ semImagem: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(eq(products.ativo, true), sql`JSON_LENGTH(${products.imagens}) = 0`))

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(products)
    .where(where)

  const rows = await db
    .select({
      id: products.id,
      nome: products.nome,
      slug: products.slug,
      preco: products.preco,
      precoDe: products.precoDe,
      estoque: products.estoque,
      ativo: products.ativo,
      isKg: products.isKg,
      imagens: products.imagens,
      categoriaNome: categories.nome,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoriaId, categories.id))
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(PER_PAGE)
    .offset((pagina - 1) * PER_PAGE)

  const totalNum = Number(total)
  const semImagemNum = Number(semImagem)
  const paginas = Math.ceil(totalNum / PER_PAGE)

  function pageUrl(p: number) {
    const q = new URLSearchParams()
    if (busca) q.set('q', busca)
    if (filtroAtivo) q.set('ativo', filtroAtivo)
    if (filtroSemImagem) q.set('semImagem', 'true')
    if (p > 1) q.set('pagina', String(p))
    return `/admin/produtos${q.toString() ? `?${q}` : ''}`
  }

  const tableRows = rows.map(p => ({
    id: p.id,
    nome: p.nome,
    slug: p.slug,
    preco: String(p.preco),
    precoDe: p.precoDe ? String(p.precoDe) : null,
    estoque: String(p.estoque),
    ativo: p.ativo,
    isKg: p.isKg,
    imagens: p.imagens,
    categoriaNome: p.categoriaNome ?? null,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">Produtos</h1>
          <p className="text-on-surface-variant text-sm mt-1">{totalNum.toLocaleString('pt-BR')} produto{totalNum !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {semImagemNum > 0 && !filtroSemImagem && (
            <Link
              href="/admin/produtos?semImagem=true&ativo=true"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold border border-amber-600 hover:bg-amber-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">image_not_supported</span>
              {semImagemNum} sem imagem
            </Link>
          )}
          <Link
            href="/admin/produtos/novo"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo produto
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <form method="get" className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome..."
          className="flex-1 min-w-[200px] px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          name="ativo"
          defaultValue={filtroAtivo ?? ''}
          className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none"
        >
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <select
          name="semImagem"
          defaultValue={filtroSemImagem ? 'true' : ''}
          className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none"
        >
          <option value="">Todas as imagens</option>
          <option value="true">⚠ Sem imagem</option>
        </select>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm"
        >
          Filtrar
        </button>
        {(busca || filtroAtivo || filtroSemImagem) && (
          <Link href="/admin/produtos" className="px-5 py-2 rounded-xl bg-surface-container text-on-surface-variant font-bold text-sm">
            Limpar
          </Link>
        )}
      </form>

      {/* Banner de filtro ativo */}
      {filtroSemImagem && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-amber-500 border border-amber-600 rounded-xl text-sm text-white font-medium">
          <span className="material-symbols-outlined text-[18px]">image_not_supported</span>
          Mostrando {totalNum} produto{totalNum !== 1 ? 's' : ''} sem imagem — clique em ✏️ para adicionar fotos.
        </div>
      )}

      {/* Tabela interativa */}
      {rows.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
          <p className="text-on-surface-variant text-sm text-center py-12">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <ProductsTable
          rows={tableRows}
          updatePrice={updateProductPrice}
          bulkToggle={bulkToggleAtivo}
        />
      )}

      {/* Paginação */}
      {paginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {pagina > 1 && (
            <Link href={pageUrl(pagina - 1)} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium">← Anterior</Link>
          )}
          <span className="text-sm text-on-surface-variant px-2">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={pageUrl(pagina + 1)} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium">Próxima →</Link>
          )}
        </div>
      )}
    </div>
  )
}
