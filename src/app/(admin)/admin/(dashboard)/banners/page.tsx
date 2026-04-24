export const dynamic = 'force-dynamic'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { banners } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

// ── Server Actions ──────────────────────────────────────────────────────────

async function createBanner(formData: FormData) {
  'use server'

  const titulo = (formData.get('titulo') as string).trim()
  const imagemUrl = (formData.get('imagemUrl') as string).trim()
  const linkUrl = (formData.get('linkUrl') as string | null)?.trim() || null
  const ordemRaw = formData.get('ordem') as string | null
  const inicio = (formData.get('inicio') as string | null)?.trim()
  const fim = (formData.get('fim') as string | null)?.trim()
  const ativo = formData.get('ativo') === 'on'

  if (!titulo || !imagemUrl) return

  await db.insert(banners).values({
    titulo,
    imagemUrl,
    linkUrl,
    ordem: ordemRaw ? parseInt(ordemRaw) : 0,
    ativo,
    inicio: inicio ? new Date(inicio) : null,
    fim: fim ? new Date(fim) : null,
  })

  revalidatePath('/admin/banners')
  revalidatePath('/')
}

async function deleteBanner(id: number) {
  'use server'
  await db.delete(banners).where(eq(banners.id, id))
  revalidatePath('/admin/banners')
  revalidatePath('/')
}

async function toggleBannerAtivo(id: number, ativo: boolean) {
  'use server'
  await db.update(banners).set({ ativo: !ativo }).where(eq(banners.id, id))
  revalidatePath('/admin/banners')
  revalidatePath('/')
}

async function updateOrdem(id: number, ordem: number) {
  'use server'
  await db.update(banners).set({ ordem }).where(eq(banners.id, id))
  revalidatePath('/admin/banners')
  revalidatePath('/')
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function AdminBannersPage() {
  const lista = await db
    .select()
    .from(banners)
    .orderBy(asc(banners.ordem), asc(banners.createdAt))

  const INPUT =
    'w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary'
  const LABEL = 'block text-sm font-medium text-on-surface-variant mb-1'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-headline font-extrabold text-on-surface">Banners</h1>
        <p className="text-on-surface-variant text-sm mt-1">Banners do carrossel na home — {lista.length} cadastrado{lista.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de criação */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 sticky top-6">
            <h2 className="text-base font-bold text-on-surface mb-4">Novo banner</h2>
            <form action={createBanner} className="flex flex-col gap-4">
              <div>
                <label htmlFor="titulo" className={LABEL}>Título <span className="text-error">*</span></label>
                <input id="titulo" name="titulo" type="text" required placeholder="Ex.: Promoção de Verão" className={INPUT} />
              </div>
              <div>
                <label htmlFor="imagemUrl" className={LABEL}>URL da imagem <span className="text-error">*</span></label>
                <input id="imagemUrl" name="imagemUrl" type="text" required placeholder="/uploads/banners/banner1.jpg" className={INPUT} />
                <p className="text-xs text-on-surface-variant mt-1">Caminho local ou URL externa. Recomendado: 1200×400px.</p>
              </div>
              <div>
                <label htmlFor="linkUrl" className={LABEL}>Link ao clicar (opcional)</label>
                <input id="linkUrl" name="linkUrl" type="text" placeholder="/produtos?categoria=ofertas" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ordem" className={LABEL}>Ordem</label>
                  <input id="ordem" name="ordem" type="number" min="0" defaultValue="0" className={INPUT} />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-2 pb-2">
                    <input id="ativo" name="ativo" type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary cursor-pointer" />
                    <label htmlFor="ativo" className="text-sm text-on-surface cursor-pointer select-none">Ativo</label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inicio" className={LABEL}>Início</label>
                  <input id="inicio" name="inicio" type="datetime-local" className={INPUT} />
                </div>
                <div>
                  <label htmlFor="fim" className={LABEL}>Fim</label>
                  <input id="fim" name="fim" type="datetime-local" className={INPUT} />
                </div>
              </div>
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm w-full">
                Adicionar banner
              </button>
            </form>
          </div>
        </div>

        {/* Lista de banners */}
        <div className="lg:col-span-2">
          {lista.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-3 block">image</span>
              <p className="text-on-surface-variant text-sm">Nenhum banner cadastrado ainda.</p>
              <p className="text-on-surface-variant text-xs mt-1">Adicione o primeiro banner ao lado.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {lista.map(banner => (
                <div
                  key={banner.id}
                  className={`bg-surface-container-lowest rounded-2xl border overflow-hidden ${banner.ativo ? 'border-outline-variant/20' : 'border-outline-variant/10 opacity-60'}`}
                >
                  {/* Preview da imagem */}
                  <div className="relative h-40 bg-surface-container overflow-hidden">
                    <img
                      src={banner.imagemUrl}
                      alt={banner.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-3">
                      <p className="text-white font-bold text-sm line-clamp-1">{banner.titulo}</p>
                      {banner.linkUrl && (
                        <p className="text-white/70 text-xs truncate max-w-xs">{banner.linkUrl}</p>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        banner.ativo ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        {banner.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-black/50 text-white">
                        #{banner.ordem}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                    {/* Alterar ordem */}
                    <form action={updateOrdem.bind(null, banner.id, Math.max(0, banner.ordem - 1))} className="inline">
                      <button type="submit" className="text-xs px-2 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-low transition-colors" title="Mover para cima">↑</button>
                    </form>
                    <form action={updateOrdem.bind(null, banner.id, banner.ordem + 1)} className="inline">
                      <button type="submit" className="text-xs px-2 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-low transition-colors" title="Mover para baixo">↓</button>
                    </form>

                    <div className="h-4 w-px bg-outline-variant/30" />

                    {/* Toggle ativo */}
                    <form action={toggleBannerAtivo.bind(null, banner.id, banner.ativo)} className="inline">
                      <button type="submit" className="text-xs px-3 py-1 rounded-lg bg-surface-container text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">
                        {banner.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>

                    {/* Datas */}
                    {(banner.inicio || banner.fim) && (
                      <p className="text-xs text-on-surface-variant ml-auto">
                        {banner.inicio && <>De {new Date(banner.inicio).toLocaleDateString('pt-BR')}</>}
                        {banner.inicio && banner.fim && ' até '}
                        {banner.fim && new Date(banner.fim).toLocaleDateString('pt-BR')}
                      </p>
                    )}

                    {/* Deletar */}
                    <form
                      action={deleteBanner.bind(null, banner.id)}
                      className="ml-auto"
                      onSubmit={(e) => {
                        if (!confirm(`Excluir o banner "${banner.titulo}"?`)) e.preventDefault()
                      }}
                    >
                      <button type="submit" className="text-xs px-3 py-1 rounded-lg bg-error-container text-on-error-container font-medium hover:opacity-80 transition-opacity">
                        Excluir
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
