export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { eq, desc, sql, gte, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { orderStatuses } from '@/lib/db/schema'
import PedidosTable from './PedidosTable'

type Status = typeof orderStatuses[number]

const STATUS_LABELS: Record<Status, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  separando: 'Separando',
  saiu_entrega: 'Saiu p/ entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const PER_PAGE = 30

interface Props {
  searchParams: Promise<{ status?: string; pagina?: string; data?: string }>
}

async function bulkUpdateStatus(ids: number[], status: Status) {
  'use server'
  if (!ids.length) return
  await db.update(orders).set({ status }).where(inArray(orders.id, ids))
  revalidatePath('/admin/pedidos')
}

export default async function AdminPedidos({ searchParams }: Props) {
  const params = await searchParams
  const filtroStatus = params.status as Status | undefined
  const filtroHoje = params.data === 'hoje'
  const pagina = parseInt(params.pagina ?? '1')

  const conditions = []
  if (filtroStatus) conditions.push(eq(orders.status, filtroStatus))
  if (filtroHoje) {
    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)
    conditions.push(gte(orders.createdAt, inicioHoje))
  }
  const where = conditions.length ? and(...conditions) : undefined

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
    if (filtroHoje) q.set('data', 'hoje')
    if (p > 1) q.set('pagina', String(p))
    return `/admin/pedidos${q.toString() ? `?${q}` : ''}`
  }

  const tableRows = rows.map(o => ({
    id: o.id,
    numero: o.numero,
    clienteNome: o.clienteNome,
    clienteTelefone: o.clienteTelefone,
    status: o.status,
    total: String(o.total),
    createdAt: o.createdAt,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-headline font-extrabold text-on-surface">Pedidos</h1>
        <p className="text-on-surface-variant text-sm mt-1">{totalNum} pedido{totalNum !== 1 ? 's' : ''}</p>
      </div>

      {filtroHoje && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary font-medium">
          <span className="material-symbols-outlined text-[18px]">today</span>
          Mostrando pedidos de hoje — {new Date().toLocaleDateString('pt-BR')}
          <Link href="/admin/pedidos" className="ml-auto text-xs underline text-on-surface-variant">Ver todos</Link>
        </div>
      )}

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
        {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
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

      <PedidosTable rows={tableRows} bulkUpdateStatus={bulkUpdateStatus} />

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
