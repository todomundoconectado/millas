export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { orders, products } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

async function getDashboardStats() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [
    pedidosHoje,
    receitaHoje,
    produtosAtivos,
    pedidosPendentes,
  ] = await Promise.all([
    db.select({ total: sql<number>`COUNT(*)` })
      .from(orders)
      .where(gte(orders.createdAt, hoje))
      .then(r => Number(r[0]?.total ?? 0)),

    db.select({ soma: sql<string>`COALESCE(SUM(total), 0)` })
      .from(orders)
      .where(and(gte(orders.createdAt, hoje), eq(orders.pagamentoStatus, 'aprovado')))
      .then(r => Number(r[0]?.soma ?? 0)),

    db.select({ total: sql<number>`COUNT(*)` })
      .from(products)
      .where(eq(products.ativo, true))
      .then(r => Number(r[0]?.total ?? 0)),

    db.select({ total: sql<number>`COUNT(*)` })
      .from(orders)
      .where(eq(orders.status, 'pendente'))
      .then(r => Number(r[0]?.total ?? 0)),
  ])

  return { pedidosHoje, receitaHoje, produtosAtivos, pedidosPendentes }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  const cards = [
    {
      label: 'Pedidos hoje',
      value: String(stats.pedidosHoje),
      icon: 'receipt_long',
      color: 'text-primary',
    },
    {
      label: 'Receita hoje',
      value: stats.receitaHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: 'payments',
      color: 'text-secondary',
    },
    {
      label: 'Produtos ativos',
      value: stats.produtosAtivos.toLocaleString('pt-BR'),
      icon: 'inventory_2',
      color: 'text-tertiary',
    },
    {
      label: 'Pedidos pendentes',
      value: String(stats.pedidosPendentes),
      icon: 'pending_actions',
      color: 'text-error',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface">Dashboard</h1>
        <p className="text-on-surface-variant text-sm mt-1">Visão geral do Super Millas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
            <span className={`material-symbols-outlined text-[28px] filled ${card.color}`}>{card.icon}</span>
            <p className="text-2xl font-headline font-extrabold text-on-surface mt-3">{card.value}</p>
            <p className="text-xs text-on-surface-variant mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
