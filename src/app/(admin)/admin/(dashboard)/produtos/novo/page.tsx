export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { products, categories } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

// ── Data ───────────────────────────────────────────────────────────────────

async function getActiveCategories() {
  return db
    .select({ id: categories.id, nome: categories.nome, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.ativo, true))
    .orderBy(asc(categories.nome))
}

// ── Server Action ──────────────────────────────────────────────────────────

async function createProduct(formData: FormData) {
  'use server'

  const nome = (formData.get('nome') as string).trim()
  const slugRaw = (formData.get('slug') as string | null)?.trim() ?? ''
  const preco = formData.get('preco') as string
  const precoDeRaw = (formData.get('precoDe') as string | null)?.trim()
  const categoriaIdRaw = formData.get('categoriaId') as string | null
  const estoqueRaw = (formData.get('estoque') as string | null)?.trim() ?? '0'
  const isKg = formData.get('isKg') === 'on'
  const ativo = formData.get('ativo') === 'on'
  const descricao = (formData.get('descricao') as string | null)?.trim() ?? null

  // Generate slug
  function toSlug(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
  }

  let baseSlug = slugRaw ? toSlug(slugRaw) : toSlug(nome)

  // Deduplicate slug
  let slug = baseSlug
  let suffix = 2
  while (true) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)
    if (existing.length === 0) break
    slug = `${baseSlug}-${suffix}`
    suffix++
  }

  await db.insert(products).values({
    nome,
    slug,
    preco,
    precoDe: precoDeRaw ? precoDeRaw : null,
    categoriaId: categoriaIdRaw ? parseInt(categoriaIdRaw, 10) : null,
    estoque: estoqueRaw || '0',
    isKg,
    ativo,
    descricao: descricao || null,
    imagens: [],
  })

  redirect('/admin/produtos')
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function NovoProdutoPage() {
  const cats = await getActiveCategories()

  // Separate parents and children for grouping
  const parents = cats.filter((c) => !c.parentId)
  const children = cats.filter((c) => c.parentId)

  const INPUT =
    'w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary'
  const LABEL = 'block text-sm font-medium text-on-surface-variant mb-1'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">Novo produto</h1>
          <p className="text-on-surface-variant text-sm mt-1">Preencha os dados do produto</p>
        </div>
        <Link
          href="/admin/produtos"
          className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant text-sm font-medium"
        >
          ← Voltar
        </Link>
      </div>

      {/* Form */}
      <form action={createProduct}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Identificação */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <h2 className="text-base font-bold text-on-surface mb-4">Identificação</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="nome" className={LABEL}>
                    Nome <span className="text-error">*</span>
                  </label>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    required
                    placeholder="Ex.: Maçã Fuji"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="slug" className={LABEL}>
                    Slug
                  </label>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    placeholder="será gerado automaticamente se vazio"
                    className={INPUT}
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    Usado na URL do produto. Deixe vazio para gerar a partir do nome.
                  </p>
                </div>
                <div>
                  <label htmlFor="descricao" className={LABEL}>
                    Descrição
                  </label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    rows={5}
                    placeholder="Descreva o produto..."
                    className={`${INPUT} resize-y`}
                  />
                </div>
              </div>
            </div>

            {/* Preços */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <h2 className="text-base font-bold text-on-surface mb-4">Preços</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="preco" className={LABEL}>
                    Preço de venda (R$) <span className="text-error">*</span>
                  </label>
                  <input
                    id="preco"
                    name="preco"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="precoDe" className={LABEL}>
                    Preço "de" / original (R$)
                  </label>
                  <input
                    id="precoDe"
                    name="precoDe"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className={INPUT}
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    Exibido riscado quando há promoção. Opcional.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Organização */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <h2 className="text-base font-bold text-on-surface mb-4">Organização</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="categoriaId" className={LABEL}>
                    Categoria
                  </label>
                  <select id="categoriaId" name="categoriaId" className={INPUT}>
                    <option value="">— Sem categoria —</option>
                    {parents.map((parent) => {
                      const subs = children.filter((c) => c.parentId === parent.id)
                      if (subs.length > 0) {
                        return (
                          <optgroup key={parent.id} label={parent.nome}>
                            <option value={parent.id}>{parent.nome}</option>
                            {subs.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                &nbsp;&nbsp;{sub.nome}
                              </option>
                            ))}
                          </optgroup>
                        )
                      }
                      return (
                        <option key={parent.id} value={parent.id}>
                          {parent.nome}
                        </option>
                      )
                    })}
                    {/* Orphan children (parent not active) */}
                    {children
                      .filter((c) => !parents.find((p) => p.id === c.parentId))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Estoque */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <h2 className="text-base font-bold text-on-surface mb-4">Estoque</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="estoque" className={LABEL}>
                    Quantidade em estoque
                  </label>
                  <input
                    id="estoque"
                    name="estoque"
                    type="number"
                    step="0.001"
                    min="0"
                    defaultValue="0"
                    className={INPUT}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="isKg"
                    name="isKg"
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <label htmlFor="isKg" className="text-sm text-on-surface cursor-pointer select-none">
                    Vendido por peso (kg)
                  </label>
                </div>
              </div>
            </div>

            {/* Publicação */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <h2 className="text-base font-bold text-on-surface mb-4">Publicação</h2>
              <div className="flex items-center gap-3">
                <input
                  id="ativo"
                  name="ativo"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <label htmlFor="ativo" className="text-sm text-on-surface cursor-pointer select-none">
                  Produto ativo (visível no site)
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm w-full"
              >
                Salvar produto
              </button>
              <Link
                href="/admin/produtos"
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant text-sm font-medium text-center"
              >
                Cancelar
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
