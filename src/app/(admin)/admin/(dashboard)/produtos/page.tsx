export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { products, categories } from '@/lib/db/schema'
import { eq, and, like, sql, desc } from 'drizzle-orm'

const PER_PAGE = 50

interface Props {
  searchParams: Promise<{ q?: string; pagina?: string; ativo?: string }>
}

export default async function AdminProdutos({ searchParams }: Props) {
  const params = await searchParams
  const busca = params.q ?? ''
  const pagina = parseInt(params.pagina ?? '1')
  const filtroAtivo = params.ativo // 'true' | 'false' | undefined

  const conditions = []
  if (busca) conditions.push(like(products.nome, `%${busca}%`))
  if (filtroAtivo === 'true') conditions.push(eq(products.ativo, true))
  if (filtroAtivo === 'false') conditions.push(eq(products.ativo, false))

  const where = conditions.length ? and(...conditions) : undefined

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
  const paginas = Math.ceil(totalNum / PER_PAGE)

  function pageUrl(p: number) {
    const q = new URLSearchParams()
    if (busca) q.set('q', busca)
    if (filtroAtivo) q.set('ativo', filtroAtivo)
    if (p > 1) q.set('pagina', String(p))
    return `/admin/produtos${q.toString() ? `?${q}` : ''}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">Produtos</h1>
          <p className="text-on-surface-variant text-sm mt-1">{totalNum.toLocaleString('pt-BR')} produto{totalNum !== 1 ? 's' : ''}</p>
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
        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm"
        >
          Filtrar
        </button>
        {(busca || filtroAtivo) && (
          <Link href="/admin/produtos" className="px-5 py-2 rounded-xl bg-surface-container text-on-surface-variant font-bold text-sm">
            Limpar
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-12">Nenhum produto encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container">
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Produto</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden md:table-cell">Categoria</th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Preço</th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden sm:table-cell">Estoque</th>
                  <th className="text-center px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {rows.map((p) => {
                  const imagem = (p.imagens as string[])?.[0]
                  return (
                    <tr key={p.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden shrink-0">
                            {imagem ? (
                              <img src={imagem} alt={p.nome} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px] text-outline-variant">image</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-on-surface truncate max-w-[200px] md:max-w-[300px]">{p.nome}</p>
                            <p className="text-xs text-on-surface-variant">{p.isKg ? 'Vendido por kg' : 'Unidade'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant hidden md:table-cell">
                        {p.categoriaNome ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="font-bold text-on-surface">
                            {Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          {p.precoDe && (
                            <p className="text-xs text-on-surface-variant line-through">
                              {Number(p.precoDe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface-variant hidden sm:table-cell">
                        {Number(p.estoque).toLocaleString('pt-BR')} {p.isKg ? 'kg' : 'un'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.ativo
                            ? 'bg-primary-container text-on-primary-container'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
