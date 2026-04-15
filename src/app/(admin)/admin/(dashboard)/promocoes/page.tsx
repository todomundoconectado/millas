export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { promotions, products, categories } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// ── Server Actions ──────────────────────────────────────────────────────────

async function createPromotion(formData: FormData) {
  'use server'

  const nome = (formData.get('nome') as string | null)?.trim() ?? ''
  const tipo = formData.get('tipo') as 'percentual' | 'valor_fixo' | 'compre_x_leve_y' | 'combo'
  const valorRaw = formData.get('valor') as string | null
  const compraQtdRaw = formData.get('compraQtd') as string | null
  const leveQtdRaw = formData.get('leveQtd') as string | null
  const inicioRaw = formData.get('inicio') as string | null
  const fimRaw = formData.get('fim') as string | null
  const ativoRaw = formData.get('ativo')
  const descricao = (formData.get('descricao') as string | null)?.trim() || null

  if (!nome || !tipo) return

  await db.insert(promotions).values({
    nome,
    tipo,
    descricao,
    valor: valorRaw && valorRaw !== '' ? valorRaw : null,
    compraQtd: compraQtdRaw && compraQtdRaw !== '' ? parseInt(compraQtdRaw) : null,
    leveQtd: leveQtdRaw && leveQtdRaw !== '' ? parseInt(leveQtdRaw) : null,
    inicio: inicioRaw && inicioRaw !== '' ? new Date(inicioRaw) : null,
    fim: fimRaw && fimRaw !== '' ? new Date(fimRaw) : null,
    ativo: ativoRaw === 'on',
  })

  revalidatePath('/admin/promocoes')
}

async function deletePromotion(id: number) {
  'use server'
  await db.delete(promotions).where(eq(promotions.id, id))
  revalidatePath('/admin/promocoes')
}

async function togglePromotionAtivo(id: number, ativo: boolean) {
  'use server'
  await db.update(promotions).set({ ativo }).where(eq(promotions.id, id))
  revalidatePath('/admin/promocoes')
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const tipoLabels: Record<string, string> = {
  percentual: 'Percentual',
  valor_fixo: 'Valor fixo',
  compre_x_leve_y: 'Compre X Leve Y',
  combo: 'Combo',
}

function formatValor(row: {
  tipo: string
  valor: string | null
  compraQtd: number | null
  leveQtd: number | null
}) {
  if (row.tipo === 'percentual' && row.valor != null) {
    return `${Number(row.valor).toLocaleString('pt-BR')}%`
  }
  if (row.tipo === 'valor_fixo' && row.valor != null) {
    return Number(row.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  if (row.tipo === 'compre_x_leve_y') {
    return `Leve ${row.leveQtd ?? '?'} c/ mín ${row.compraQtd ?? '?'}`
  }
  return '—'
}

function formatPeriod(inicio: Date | null, fim: Date | null) {
  if (!inicio || !fim) return '—'
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${fmt(inicio)} — ${fmt(fim)}`
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPromocoes() {
  const rows = await db
    .select({
      id: promotions.id,
      nome: promotions.nome,
      tipo: promotions.tipo,
      descricao: promotions.descricao,
      valor: promotions.valor,
      compraQtd: promotions.compraQtd,
      leveQtd: promotions.leveQtd,
      ativo: promotions.ativo,
      inicio: promotions.inicio,
      fim: promotions.fim,
      produtoNome: products.nome,
      categoriaNome: categories.nome,
    })
    .from(promotions)
    .leftJoin(products, eq(promotions.produtoId, products.id))
    .leftJoin(categories, eq(promotions.categoriaId, categories.id))
    .orderBy(desc(promotions.createdAt))

  const inputCls =
    'w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-headline font-extrabold text-on-surface">Promoções</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Preços de/por, combos, leve X pague Y
        </p>
      </div>

      {/* ── Creation form ────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 mb-8">
        <h2 className="text-base font-bold text-on-surface mb-5">Nova promoção</h2>
        <form action={createPromotion} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Nome */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
              Nome <span className="text-error">*</span>
            </label>
            <input
              type="text"
              name="nome"
              required
              placeholder="Ex.: 20% off em laticínios"
              className={inputCls}
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
              Tipo <span className="text-error">*</span>
            </label>
            <select name="tipo" required className={inputCls}>
              <option value="percentual">Percentual</option>
              <option value="valor_fixo">Valor fixo</option>
              <option value="compre_x_leve_y">Compre X Leve Y</option>
              <option value="combo">Combo</option>
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
              Valor (% ou R$)
            </label>
            <input
              type="number"
              name="valor"
              step="0.01"
              min="0"
              placeholder="0.00"
              className={inputCls}
            />
          </div>

          {/* compraQtd */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
              Compra qtd (X)
            </label>
            <input
              type="number"
              name="compraQtd"
              step="1"
              min="1"
              placeholder="Ex.: 3"
              className={inputCls}
            />
          </div>

          {/* leveQtd */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
              Leve qtd (Y)
            </label>
            <input
              type="number"
              name="leveQtd"
              step="1"
              min="1"
              placeholder="Ex.: 4"
              className={inputCls}
            />
          </div>

          {/* Início */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
              Início
            </label>
            <input type="datetime-local" name="inicio" className={inputCls} />
          </div>

          {/* Fim */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
              Fim
            </label>
            <input type="datetime-local" name="fim" className={inputCls} />
          </div>

          {/* Descrição */}
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
              Descrição
            </label>
            <textarea
              name="descricao"
              rows={2}
              placeholder="Descrição opcional..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Ativo + submit */}
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="ativo"
                defaultChecked
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm text-on-surface">Ativo</span>
            </label>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm"
            >
              Criar promoção
            </button>
          </div>
        </form>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-12">
            Nenhuma promoção cadastrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container">
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden sm:table-cell">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden md:table-cell">
                    Valor
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden lg:table-cell">
                    Período
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container/50 transition-colors">
                    {/* Nome */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-on-surface">{row.nome}</p>
                      {row.descricao && (
                        <p className="text-xs text-on-surface-variant mt-0.5 max-w-[220px] truncate">
                          {row.descricao}
                        </p>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3 text-on-surface-variant hidden sm:table-cell">
                      {tipoLabels[row.tipo] ?? row.tipo}
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 text-on-surface hidden md:table-cell">
                      {formatValor(row)}
                    </td>

                    {/* Período */}
                    <td className="px-4 py-3 text-on-surface-variant hidden lg:table-cell">
                      {formatPeriod(row.inicio, row.fim)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          row.ativo
                            ? 'bg-primary-container text-on-primary-container'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {row.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle ativo */}
                        <form
                          action={togglePromotionAtivo.bind(null, row.id, !row.ativo)}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-container-high transition-colors"
                          >
                            {row.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </form>

                        {/* Delete */}
                        <form action={deletePromotion.bind(null, row.id)}>
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-bold hover:bg-error/20 transition-colors"
                            onClick={(e) => {
                              if (!confirm(`Excluir "${row.nome}"?`)) e.preventDefault()
                            }}
                          >
                            Excluir
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
