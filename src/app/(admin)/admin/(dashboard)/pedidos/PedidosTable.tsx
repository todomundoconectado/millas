'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { orderStatuses } from '@/lib/db/schema'

type Status = typeof orderStatuses[number]

const STATUS_LABELS: Record<Status, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  separando: 'Separando',
  saiu_entrega: 'Saiu p/ entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<Status, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  separando: 'bg-purple-100 text-purple-800',
  saiu_entrega: 'bg-orange-100 text-orange-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
}

interface PedidoRow {
  id: number
  numero: string
  clienteNome: string
  clienteTelefone: string
  status: Status
  total: string | number
  createdAt: Date
}

interface Props {
  rows: PedidoRow[]
  bulkUpdateStatus: (ids: number[], status: Status) => Promise<void>
}

export default function PedidosTable({ rows, bulkUpdateStatus }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<Status>('confirmado')
  const [isPending, startTransition] = useTransition()

  const allSelected = rows.length > 0 && selected.size === rows.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map(r => r.id)))
    }
  }

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyBulk() {
    if (selected.size === 0) return
    startTransition(async () => {
      await bulkUpdateStatus(Array.from(selected), bulkStatus)
      setSelected(new Set())
    })
  }

  return (
    <div>
      {/* Barra de ações em lote */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-primary/8 border border-primary/20 rounded-2xl">
          <span className="text-sm font-semibold text-primary">
            {selected.size} pedido{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-on-surface-variant">Alterar status para:</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as Status)}
              className="px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={applyBulk}
              disabled={isPending}
              className="px-4 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {isPending ? 'Salvando...' : 'Aplicar'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-12">Nenhum pedido encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Pedido</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-center px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {rows.map((o) => {
                  const isSelected = selected.has(o.id)
                  return (
                    <tr
                      key={o.id}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary/5 hover:bg-primary/8'
                          : 'hover:bg-surface-container/50'
                      }`}
                      onClick={() => toggleOne(o.id)}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(o.id)}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Link
                          href={`/admin/pedidos/${o.id}`}
                          className="font-mono text-on-surface font-medium hover:text-primary transition-colors"
                        >
                          #{o.numero}
                        </Link>
                      </td>
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
                        {new Date(o.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
