export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { products, categories } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import ImageUploadSection from '@/components/admin/ImageUploadSection'
import DescricaoField from '@/components/admin/DescricaoField'
import { parseImagens } from '@/lib/db/queries/products'
import { buscarImagemPorEAN } from '@/lib/ean-images'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ean?: string }>
}

async function getActiveCategories() {
  return db
    .select({ id: categories.id, nome: categories.nome, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.ativo, true))
    .orderBy(asc(categories.nome))
}

async function updateProduct(id: number, formData: FormData) {
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
  const descricaoIa = formData.get('descricaoIa') === '1'

  function toSlug(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
  }

  const baseSlug = slugRaw ? toSlug(slugRaw) : toSlug(nome)

  // Ensure slug uniqueness (excluding current product)
  let slug = baseSlug
  let suffix = 2
  while (true) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)
    if (existing.length === 0 || existing[0].id === id) break
    slug = `${baseSlug}-${suffix}`
    suffix++
  }

  await db.update(products).set({
    nome,
    slug,
    preco,
    precoDe: precoDeRaw || null,
    categoriaId: categoriaIdRaw ? parseInt(categoriaIdRaw, 10) : null,
    estoque: estoqueRaw || '0',
    isKg,
    ativo,
    descricao: descricao || null,
    descricaoIa,
  }).where(eq(products.id, id))

  revalidatePath('/admin/produtos')
  revalidatePath(`/admin/produtos/${id}`)
  redirect('/admin/produtos')
}

async function updateImages(id: number, formData: FormData) {
  'use server'

  const imagensRaw = (formData.get('imagens') as string | null)?.trim() ?? ''
  const imagens = imagensRaw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  await db.update(products).set({ imagens }).where(eq(products.id, id))
  revalidatePath(`/admin/produtos/${id}`)
  revalidatePath(`/produtos`)
}

async function buscarEanAction(id: number) {
  'use server'

  const [produto] = await db
    .select({ ean: products.ean, estoque: products.estoque })
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!produto?.ean) redirect(`/admin/produtos/${id}?ean=sem-ean`)

  try {
    const result = await buscarImagemPorEAN(produto.ean, id)
    if (result) {
      const ativo = Number(produto.estoque) >= 10
      await db.update(products).set({ imagens: [result.localPath], ativo }).where(eq(products.id, id))
      revalidatePath(`/admin/produtos/${id}`)
      revalidatePath('/admin/produtos')
      redirect(`/admin/produtos/${id}?ean=ok`)
    } else {
      redirect(`/admin/produtos/${id}?ean=nao-encontrado`)
    }
  } catch {
    redirect(`/admin/produtos/${id}?ean=erro`)
  }
}

export default async function EditarProdutoPage({ params, searchParams }: Props) {
  const { id: idStr } = await params
  const { ean: eanResult } = await searchParams
  const id = parseInt(idStr, 10)
  if (isNaN(id)) notFound()

  const [produto] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!produto) notFound()

  const cats = await getActiveCategories()
  const parents = cats.filter(c => !c.parentId)
  const children = cats.filter(c => c.parentId)

  const INPUT =
    'w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary'
  const LABEL = 'block text-sm font-medium text-on-surface-variant mb-1'

  const updateAction = updateProduct.bind(null, id)
  const updateImagesAction = updateImages.bind(null, id)
  const buscarEanBoundAction = buscarEanAction.bind(null, id)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">Editar produto</h1>
          <p className="text-on-surface-variant text-sm mt-1 truncate max-w-xs">{produto.nome}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/produtos/${produto.slug}`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant text-sm font-medium"
          >
            Ver no site ↗
          </Link>
          <Link
            href="/admin/produtos"
            className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant text-sm font-medium"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {eanResult === 'ok' && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-green-50 border border-green-300 rounded-xl text-green-800 text-sm font-medium">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Imagem encontrada e salva com sucesso.
        </div>
      )}
      {eanResult === 'nao-encontrado' && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-sm font-medium">
          <span className="material-symbols-outlined text-[18px]">image_search</span>
          Nenhuma imagem encontrada para este EAN nas fontes disponíveis.
        </div>
      )}
      {(eanResult === 'erro' || eanResult === 'sem-ean') && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-300 rounded-xl text-red-800 text-sm font-medium">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {eanResult === 'sem-ean' ? 'Este produto não tem EAN cadastrado.' : 'Erro ao buscar imagem. Tente novamente.'}
        </div>
      )}

      <form action={updateAction}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Identificação */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <h2 className="text-base font-bold text-on-surface mb-4">Identificação</h2>
              <div className="flex flex-col gap-4">
                {/* Campos somente-leitura (vindos do sistema externo) */}
                {(produto.sku || produto.ean) && (
                  <div className="grid grid-cols-2 gap-4">
                    {produto.sku && (
                      <div>
                        <label className={LABEL}>Código</label>
                        <div className={`${INPUT} bg-surface-container-low text-on-surface-variant cursor-not-allowed select-all`}>
                          {produto.sku}
                        </div>
                      </div>
                    )}
                    {produto.ean && (
                      <div>
                        <label className={LABEL}>EAN / Cód. barras</label>
                        <div className={`${INPUT} bg-surface-container-low text-on-surface-variant cursor-not-allowed select-all font-mono`}>
                          {produto.ean}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="nome" className={LABEL}>Nome <span className="text-error">*</span></label>
                  <input
                    id="nome" name="nome" type="text" required
                    defaultValue={produto.nome}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="slug" className={LABEL}>Slug</label>
                  <input
                    id="slug" name="slug" type="text"
                    defaultValue={produto.slug}
                    className={INPUT}
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    URL do produto. Alterar o slug quebra links existentes.
                  </p>
                </div>
                <DescricaoField
                  defaultDescricao={produto.descricao ?? null}
                  defaultDescricaoIa={produto.descricaoIa}
                />
              </div>
            </div>

            {/* Preços */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <h2 className="text-base font-bold text-on-surface mb-4">Preços</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="preco" className={LABEL}>Preço de venda (R$) <span className="text-error">*</span></label>
                  <input
                    id="preco" name="preco" type="number" step="0.01" min="0" required
                    defaultValue={String(produto.preco)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="precoDe" className={LABEL}>Preço "de" / original (R$)</label>
                  <input
                    id="precoDe" name="precoDe" type="number" step="0.01" min="0"
                    defaultValue={produto.precoDe ? String(produto.precoDe) : ''}
                    placeholder="0,00"
                    className={INPUT}
                  />
                  <p className="text-xs text-on-surface-variant mt-1">Exibido riscado quando há promoção. Opcional.</p>
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
                  <label htmlFor="categoriaId" className={LABEL}>Categoria</label>
                  <select id="categoriaId" name="categoriaId" defaultValue={produto.categoriaId ?? ''} className={INPUT}>
                    <option value="">— Sem categoria —</option>
                    {parents.map(parent => {
                      const subs = children.filter(c => c.parentId === parent.id)
                      if (subs.length > 0) {
                        return (
                          <optgroup key={parent.id} label={parent.nome}>
                            <option value={parent.id}>{parent.nome}</option>
                            {subs.map(sub => (
                              <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.nome}</option>
                            ))}
                          </optgroup>
                        )
                      }
                      return <option key={parent.id} value={parent.id}>{parent.nome}</option>
                    })}
                    {children
                      .filter(c => !parents.find(p => p.id === c.parentId))
                      .map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
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
                    {produto.mobneId && (
                      <span className="ml-2 text-xs text-on-surface-variant font-normal">(sincronizado pelo Mobne)</span>
                    )}
                  </label>
                  <input
                    id="estoque" name="estoque" type="number" step="0.001" min="0"
                    defaultValue={String(produto.estoque)}
                    readOnly={!!produto.mobneId}
                    className={`${INPUT} ${produto.mobneId ? 'bg-surface-container-low text-on-surface-variant cursor-not-allowed' : ''}`}
                  />
                  {produto.mobneId && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Atualizado automaticamente pelo sync. Mínimo de 10 unidades para ativar o produto.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="isKg" name="isKg" type="checkbox"
                    defaultChecked={produto.isKg}
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

              {/* Aviso de inativo por estoque baixo */}
              {produto.mobneId && !produto.ativo && Number(produto.estoque) < 10 && (
                <div className="flex items-start gap-2 px-4 py-3 mb-4 bg-amber-50 border border-amber-300 rounded-xl">
                  <span className="material-symbols-outlined text-amber-600 text-[18px] mt-0.5 shrink-0">inventory_2</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Inativo por estoque insuficiente
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Estoque atual: <strong>{Number(produto.estoque).toFixed(produto.isKg ? 3 : 0)} {produto.isKg ? 'kg' : 'un'}</strong>.
                      O produto será ativado automaticamente quando o Mobne confirmar estoque ≥ 10.
                    </p>
                  </div>
                </div>
              )}

              {/* Aviso de inativo por falta de imagem */}
              {produto.mobneId && !produto.ativo && Number(produto.estoque) >= 10 && (produto.imagens as string[]).length === 0 && (
                <div className="flex items-start gap-2 px-4 py-3 mb-4 bg-orange-50 border border-orange-300 rounded-xl">
                  <span className="material-symbols-outlined text-orange-600 text-[18px] mt-0.5 shrink-0">image_not_supported</span>
                  <div>
                    <p className="text-sm font-semibold text-orange-800">
                      Inativo — aguardando imagem
                    </p>
                    <p className="text-xs text-orange-700 mt-0.5">
                      Estoque suficiente, mas o produto precisa de ao menos uma imagem para ser ativado. Faça upload abaixo.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  id="ativo" name="ativo" type="checkbox"
                  defaultChecked={produto.ativo}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <label htmlFor="ativo" className="text-sm text-on-surface cursor-pointer select-none">
                  Produto ativo (visível no site)
                </label>
              </div>
              {produto.mobneId && (
                <p className="text-xs text-on-surface-variant mt-2">
                  Este produto é gerenciado pelo Mobne. O sync pode alterar o status automaticamente.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm w-full"
              >
                Salvar alterações
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

      <ImageUploadSection
        productId={id}
        currentImages={parseImagens(produto.imagens)}
        updateImagesAction={updateImagesAction}
      />

      {produto.ean && (produto.imagens as string[]).length === 0 && (
        <div className="mt-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="text-base font-bold text-on-surface mb-1">Buscar imagem por EAN</h2>
          <p className="text-sm text-on-surface-variant mb-4">
            EAN: <span className="font-mono font-semibold text-on-surface">{produto.ean}</span>
            {' '}— Tenta encontrar automaticamente uma imagem nas bases Open Food Facts, Cosmos e GS1.
          </p>
          <form action={buscarEanBoundAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">image_search</span>
              Buscar imagem por EAN
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
