export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import DeleteConfirmButton from '@/components/admin/DeleteConfirmButton'
import { db } from '@/lib/db'
import { categories, products } from '@/lib/db/schema'
import type { Category } from '@/lib/db/schema'
import { eq, asc, desc, count, like, and } from 'drizzle-orm'

// ── Server Actions ─────────────────────────────────────────────────────────

async function createCategory(formData: FormData) {
  'use server'

  const nome = (formData.get('nome') as string).trim()
  let slug = (formData.get('slug') as string).trim()
  const parentIdRaw = formData.get('parentId') as string
  const ordemRaw = formData.get('ordem') as string
  const ativoRaw = formData.get('ativo')

  if (!nome) return

  if (!slug) {
    slug = nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const parentId = parentIdRaw && parentIdRaw !== '' ? parseInt(parentIdRaw) : null
  const ordem = ordemRaw ? parseInt(ordemRaw) : 0
  const ativo = ativoRaw === 'on' || ativoRaw === 'true'

  await db.insert(categories).values({
    nome,
    slug,
    parentId: parentId ?? undefined,
    ordem,
    ativo,
  })

  redirect('/admin/categorias')
}

async function toggleCategoryAtivo(id: number, ativo: boolean) {
  'use server'

  await db.update(categories).set({ ativo: !ativo }).where(eq(categories.id, id))
  revalidatePath('/admin/categorias')
}

async function deleteCategory(id: number) {
  'use server'

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.categoriaId, id))

  if (Number(total) > 0) {
    revalidatePath('/admin/categorias')
    return
  }

  await db.delete(categories).where(eq(categories.id, id))
  revalidatePath('/admin/categorias')
}

// ── Tree helpers ───────────────────────────────────────────────────────────

interface CategoryNode extends Category {
  children: CategoryNode[]
}

function buildTree(cats: Category[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>()
  for (const c of cats) map.set(c.id, { ...c, children: [] })

  const roots: CategoryNode[] = []
  for (const node of map.values()) {
    if (node.parentId == null) {
      roots.push(node)
    } else {
      const parent = map.get(node.parentId)
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
  }
  return roots
}

function flattenTree(nodes: CategoryNode[], depth = 0): { cat: CategoryNode; depth: number }[] {
  const result: { cat: CategoryNode; depth: number }[] = []
  for (const node of nodes) {
    result.push({ cat: node, depth })
    result.push(...flattenTree(node.children, depth + 1))
  }
  return result
}

// ── Page ───────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ q?: string; ativo?: string; orderBy?: string; dir?: string }>
}

export default async function AdminCategorias({ searchParams }: Props) {
  const params = await searchParams
  const busca = params.q?.trim() ?? ''
  const filtroAtivo = params.ativo // 'true' | 'false' | undefined
  const orderBy = params.orderBy ?? 'nome'
  const dir = params.dir === 'desc' ? 'desc' : 'asc'

  const hasFilter = busca !== '' || filtroAtivo !== undefined

  // Build WHERE conditions
  const conditions = []
  if (busca) conditions.push(like(categories.nome, `%${busca}%`))
  if (filtroAtivo === 'true') conditions.push(eq(categories.ativo, true))
  if (filtroAtivo === 'false') conditions.push(eq(categories.ativo, false))
  const where = conditions.length ? and(...conditions) : undefined

  // Build ORDER BY
  const colMap: Record<string, typeof categories.nome | typeof categories.ordem | typeof categories.ativo> = {
    nome: categories.nome,
    ordem: categories.ordem,
    status: categories.ativo,
  }
  const sortCol = colMap[orderBy] ?? categories.nome
  const orderExpr = dir === 'desc' ? desc(sortCol) : asc(sortCol)

  const allCats = await db
    .select()
    .from(categories)
    .where(where)
    .orderBy(hasFilter ? orderExpr : asc(categories.ordem), asc(categories.nome))

  // For tree view we always fetch everything without filter to build full tree
  const treeSource = hasFilter
    ? allCats
    : allCats

  const flat: { cat: Category; depth: number }[] = hasFilter
    ? allCats.map(c => ({ cat: c, depth: 0 }))
    : flattenTree(buildTree(treeSource))

  // Total (unfiltered) for header count
  const [{ totalAll }] = await db.select({ totalAll: count() }).from(categories)

  // ── URL helpers ──────────────────────────────────────────────────────────

  function buildUrl(overrides: Record<string, string | undefined>) {
    const q = new URLSearchParams()
    const merged = { q: busca || undefined, ativo: filtroAtivo, orderBy, dir, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== '') q.set(k, v)
    }
    return `/admin/categorias${q.toString() ? `?${q}` : ''}`
  }

  function sortUrl(col: string) {
    if (orderBy === col) {
      return buildUrl({ orderBy: col, dir: dir === 'asc' ? 'desc' : 'asc' })
    }
    return buildUrl({ orderBy: col, dir: 'asc' })
  }

  function sortIcon(col: string) {
    if (orderBy !== col) return <span className="ml-1 text-outline-variant opacity-40">↕</span>
    return <span className="ml-1 text-primary">{dir === 'asc' ? '↑' : '↓'}</span>
  }

  // Server Action wrappers
  async function toggleAction(formData: FormData) {
    'use server'
    const id = parseInt(formData.get('id') as string)
    const ativo = (formData.get('ativo') as string) === 'true'
    await toggleCategoryAtivo(id, ativo)
  }

  async function deleteAction(formData: FormData) {
    'use server'
    const id = parseInt(formData.get('id') as string)
    await deleteCategory(id)
  }

  const INPUT = 'px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-headline font-extrabold text-on-surface">Categorias</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {Number(totalAll).toLocaleString('pt-BR')} categori{Number(totalAll) !== 1 ? 'as' : 'a'} cadastrada{Number(totalAll) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Nova Categoria Form ───────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 mb-6">
        <h2 className="text-base font-bold text-on-surface mb-4">Nova categoria</h2>
        <form action={createCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Nome <span className="text-error">*</span>
            </label>
            <input
              type="text"
              name="nome"
              required
              placeholder="Ex: Frutas"
              className={INPUT}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Slug <span className="text-on-surface-variant font-normal normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              name="slug"
              placeholder="ex: frutas"
              className={INPUT}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Categoria pai
            </label>
            <select name="parentId" className={INPUT}>
              <option value="">Raiz (sem pai)</option>
              {allCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Ordem
            </label>
            <input
              type="number"
              name="ordem"
              defaultValue={0}
              min={0}
              className={INPUT}
            />
          </div>

          <div className="flex flex-col gap-1 justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-on-surface py-2">
              <input
                type="checkbox"
                name="ativo"
                defaultChecked
                className="w-4 h-4 accent-primary"
              />
              Ativa imediatamente
            </label>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm w-full sm:w-auto"
            >
              Criar categoria
            </button>
          </div>
        </form>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
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
          <option value="">Todas</option>
          <option value="true">Ativas</option>
          <option value="false">Inativas</option>
        </select>
        {/* Preserve sort params across filter submits */}
        {orderBy !== 'nome' && <input type="hidden" name="orderBy" value={orderBy} />}
        {dir !== 'asc' && <input type="hidden" name="dir" value={dir} />}
        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm"
        >
          Filtrar
        </button>
        {(busca || filtroAtivo) && (
          <Link
            href="/admin/categorias"
            className="px-5 py-2 rounded-xl bg-surface-container text-on-surface-variant font-bold text-sm"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        {flat.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-12">
            {hasFilter ? 'Nenhuma categoria encontrada para os filtros aplicados.' : 'Nenhuma categoria cadastrada. Crie a primeira acima.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">
                    <Link href={sortUrl('nome')} className="flex items-center gap-0.5 font-bold text-on-surface-variant hover:text-on-surface transition-colors w-fit">
                      Nome {sortIcon('nome')}
                    </Link>
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider hidden sm:table-cell">
                    <span className="font-bold text-on-surface-variant">Slug</span>
                  </th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-wider hidden md:table-cell">
                    <Link href={sortUrl('ordem')} className="inline-flex items-center gap-0.5 font-bold text-on-surface-variant hover:text-on-surface transition-colors">
                      Ordem {sortIcon('ordem')}
                    </Link>
                  </th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-wider">
                    <Link href={sortUrl('status')} className="inline-flex items-center gap-0.5 font-bold text-on-surface-variant hover:text-on-surface transition-colors">
                      Status {sortIcon('status')}
                    </Link>
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {flat.map(({ cat, depth }) => (
                  <tr key={cat.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3 text-on-surface font-medium">
                      <span className={depth > 0 && !hasFilter ? 'pl-8 text-on-surface-variant' : ''}>
                        {depth > 0 && !hasFilter && <span className="mr-1 text-outline-variant">{'└'.repeat(depth)}</span>}
                        {cat.nome}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-on-surface-variant font-mono text-xs hidden sm:table-cell">
                      {cat.slug}
                    </td>

                    <td className="px-4 py-3 text-center text-on-surface-variant hidden md:table-cell">
                      {cat.ordem}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          cat.ativo
                            ? 'bg-primary-container text-on-primary-container'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {cat.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <form action={toggleAction}>
                          <input type="hidden" name="id" value={cat.id} />
                          <input type="hidden" name="ativo" value={String(cat.ativo)} />
                          <button
                            type="submit"
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                              cat.ativo
                                ? 'bg-surface-container text-on-surface-variant hover:bg-outline-variant/20'
                                : 'bg-primary-container text-on-primary-container hover:bg-primary/20'
                            }`}
                          >
                            {cat.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </form>

                        <DeleteConfirmButton
                          confirmMessage={`Excluir a categoria "${cat.nome}"? Esta ação não pode ser desfeita.`}
                          action={deleteAction}
                          hiddenFields={{ id: cat.id }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-on-surface-variant mt-3 px-1">
        Categorias com produtos vinculados não podem ser excluídas.
        {!hasFilter && <span className="ml-1">Clique no cabeçalho das colunas para ordenar.</span>}
      </p>
    </div>
  )
}
