export const dynamic = 'force-dynamic'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { coupons } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// ── Server Actions ──────────────────────────────────────────────────────────

async function createCoupon(formData: FormData) {
  'use server'

  const codigo = (formData.get('codigo') as string | null)?.trim().toUpperCase() ?? ''
  const tipo = formData.get('tipo') as 'percentual' | 'valor_fixo' | 'frete_gratis'
  const valorRaw = formData.get('valor') as string | null
  const pedidoMinimoRaw = formData.get('pedidoMinimo') as string | null
  const usosMaxRaw = formData.get('usosMax') as string | null
  const validadeRaw = formData.get('validade') as string | null
  const ativoRaw = formData.get('ativo')

  if (!codigo || !tipo) return

  await db.insert(coupons).values({
    codigo,
    tipo,
    valor: valorRaw && valorRaw !== '' ? valorRaw : null,
    pedidoMinimo: pedidoMinimoRaw && pedidoMinimoRaw !== '' ? pedidoMinimoRaw : null,
    usosMax: usosMaxRaw && usosMaxRaw !== '' ? parseInt(usosMaxRaw) : null,
    validade: validadeRaw && validadeRaw !== '' ? new Date(validadeRaw) : null,
    ativo: ativoRaw === 'on' || ativoRaw === '1' || ativoRaw === 'true',
  })

  revalidatePath('/admin/cupons')
}

async function deleteCoupon(id: number) {
  'use server'
  await db.delete(coupons).where(eq(coupons.id, id))
  revalidatePath('/admin/cupons')
}

async function toggleCouponAtivo(id: number, ativo: boolean) {
  'use server'
  await db.update(coupons).set({ ativo: !ativo }).where(eq(coupons.id, id))
  revalidatePath('/admin/cupons')
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const tipoLabel: Record<string, string> = {
  percentual: 'Percentual',
  valor_fixo: 'Valor fixo',
  frete_gratis: 'Frete grátis',
}

function formatValor(tipo: string, valor: string | null): string {
  if (tipo === 'frete_gratis' || valor === null) return '—'
  const n = parseFloat(valor)
  if (isNaN(n)) return '—'
  if (tipo === 'percentual') return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatValidade(v: Date | null): string {
  if (!v) return '—'
  const d = new Date(v)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function formatUsos(usosAtuais: number, usosMax: number | null): string {
  return `${usosAtuais} / ${usosMax !== null ? usosMax : '∞'}`
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminCupons() {
  const rows = await db
    .select()
    .from(coupons)
    .orderBy(desc(coupons.createdAt))

  const inputClass =
    'w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary'
  const primaryBtn =
    'px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm'
  const deleteBtn =
    'px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-bold'

  return (
    <div>
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-headline font-extrabold text-on-surface">Cupons</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {rows.length} cupom{rows.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* New coupon form */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 mb-8">
        <h2 className="text-base font-bold text-on-surface mb-4">Novo cupom</h2>
        <form action={createCoupon} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Código */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              Código <span className="text-error">*</span>
            </label>
            <input
              type="text"
              name="codigo"
              required
              placeholder="EX: DESCONTO10"
              className={inputClass}
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              Tipo <span className="text-error">*</span>
            </label>
            <select name="tipo" required className={inputClass}>
              <option value="percentual">Percentual</option>
              <option value="valor_fixo">Valor fixo</option>
              <option value="frete_gratis">Frete grátis</option>
            </select>
          </div>

          {/* Valor */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              Valor
            </label>
            <input
              type="number"
              name="valor"
              step="0.01"
              min="0"
              placeholder="% ou R$ — deixe em branco para frete grátis"
              className={inputClass}
            />
          </div>

          {/* Pedido mínimo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              Pedido mínimo (R$)
            </label>
            <input
              type="number"
              name="pedidoMinimo"
              step="0.01"
              min="0"
              placeholder="Opcional"
              className={inputClass}
            />
          </div>

          {/* Usos máximos */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              Usos máximos
            </label>
            <input
              type="number"
              name="usosMax"
              step="1"
              min="1"
              placeholder="Ilimitado se vazio"
              className={inputClass}
            />
          </div>

          {/* Validade */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              Validade
            </label>
            <input
              type="datetime-local"
              name="validade"
              className={inputClass}
            />
          </div>

          {/* Ativo + submit */}
          <div className="flex items-end gap-4 sm:col-span-2 lg:col-span-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-on-surface">
              <input
                type="checkbox"
                name="ativo"
                defaultChecked
                className="w-4 h-4 rounded accent-primary"
              />
              Ativo
            </label>
            <button type="submit" className={primaryBtn}>
              Criar cupom
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-12">
            Nenhum cupom cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Código</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Valor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Pedido mín</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Usos</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Validade</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((coupon) => {
                  const toggleAction = toggleCouponAtivo.bind(null, coupon.id, coupon.ativo)
                  const deleteAction = deleteCoupon.bind(null, coupon.id)

                  const pedidoMinFormatted = coupon.pedidoMinimo
                    ? parseFloat(coupon.pedidoMinimo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'

                  return (
                    <tr
                      key={coupon.id}
                      className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-on-surface">
                        {coupon.codigo}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {tipoLabel[coupon.tipo] ?? coupon.tipo}
                      </td>
                      <td className="px-4 py-3 text-on-surface">
                        {formatValor(coupon.tipo, coupon.valor)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {pedidoMinFormatted}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                        {formatUsos(coupon.usosAtuais, coupon.usosMax)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                        {formatValidade(coupon.validade)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            coupon.ativo
                              ? 'bg-primary-container text-on-primary-container'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {coupon.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <form action={toggleAction}>
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-outline-variant/20 transition-colors"
                            >
                              {coupon.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                          </form>
                          <form action={deleteAction}>
                            <button
                              type="submit"
                              className={deleteBtn}
                              onClick={undefined}
                            >
                              Excluir
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
