export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import type { orderStatuses } from '@/lib/db/schema'

const STATUS_LABELS: Record<typeof orderStatuses[number], string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  separando: 'Separando',
  saiu_entrega: 'Saiu p/ entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<typeof orderStatuses[number], string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  separando: 'bg-purple-100 text-purple-800',
  saiu_entrega: 'bg-orange-100 text-orange-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
}

const PER_PAGE = 30

interface Props {
  searchParams: Promise<{ status?: string; pagina?: string }>
}

export default async function AdminPedidos({ searchParams }: Props) {
  const params = await searchParams
  const filtroStatus = params.status as typeof orderStatuses[number] | undefined
  const pagina = parseInt(params.pagina ?? '1')

  const where = filtroStatus ? eq(orders.status, filtroStatus) : undefined

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(orders)
    .where(where)

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(PER_PAGE)
    .offset((pagina - 1) * PER_PAGE)

  const totalNum = Number(total)
  const paginas = Math.ceil(totalNum / PER_PAGE)

  function pageUrl(p: number) {
    const q = new URLSearchParams()
    if (filtroStatus) q.set('status', filtroStatus)
    if (p > 1) q.set('pagina', String(p))
    return `/admin/pedidos${q.toString() ? `?${q}` : ''}`
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-headline font-extrabold text-on-surface">Pedidos</h1>
        <p className="text-on-surface-variant text-sm mt-1">{totalNum} pedido{totalNum !== 1 ? 's' : ''}</p>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Link
          href="/admin/pedidos"
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
            !filtroStatus ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Todos
        </Link>
        {(Object.keys(STATUS_LABELS) as typeof orderStatuses[number][]).map(s => (
          <Link
            key={s}
            href={`/admin/pedidos?status=${s}`}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              filtroStatus === s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-12">Nenhum pedido encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container">
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Pedido</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-center px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-on-surface font-medium">#{o.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-on-surface">{o.clienteNome}</p>
                      <p className="text-xs text-on-surface-variant">{o.clienteTelefone}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-on-surface">
                      {Number(o.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface-variant hidden md:table-cell">
                      {new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {pagina > 1 && (
            <Link href={pageUrl(pagina - 1)} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium">← Anterior</Link>
          )}
          <span className="text-sm text-on-surface-variant px-2">Página {pagina} de {paginas}</span>
          {pagina < paginas && (
            <Link href={pageUrl(pagina + 1)} className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium">Próxima →</Link>
          )}
        </div>
      )}
    </div>
  )
}
