export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { orders, products } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import RevenueChart from './RevenueChart'

async function getDashboardStats() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const seisDiasAtras = new Date(hoje)
  seisDiasAtras.setDate(seisDiasAtras.getDate() - 6)

  const vinteOitoDiasAtras = new Date(hoje)
  vinteOitoDiasAtras.setDate(vinteOitoDiasAtras.getDate() - 27)

  const cienToOitentaDiasAtras = new Date(hoje)
  cienToOitentaDiasAtras.setDate(cienToOitentaDiasAtras.getDate() - 179)

  const [
    pedidosHoje,
    receitaHoje,
    produtosAtivos,
    pedidosPendentes,
    semImagem,
    dailyRaw,
    weeklyRaw,
    monthlyRaw,
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

    db.select({ total: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(eq(products.ativo, true), sql`JSON_LENGTH(${products.imagens}) = 0`))
      .then(r => Number(r[0]?.total ?? 0)),

    // Receita diária — últimos 7 dias
    db.select({
      dia: sql<string>`DATE(${orders.createdAt})`,
      total: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
    })
      .from(orders)
      .where(and(gte(orders.createdAt, seisDiasAtras), eq(orders.pagamentoStatus, 'aprovado')))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`),

    // Receita semanal — últimas 4 semanas
    db.select({
      semana: sql<string>`YEARWEEK(${orders.createdAt}, 1)`,
      total: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
    })
      .from(orders)
      .where(and(gte(orders.createdAt, vinteOitoDiasAtras), eq(orders.pagamentoStatus, 'aprovado')))
      .groupBy(sql`YEARWEEK(${orders.createdAt}, 1)`)
      .orderBy(sql`YEARWEEK(${orders.createdAt}, 1)`),

    // Receita mensal — últimos 6 meses
    db.select({
      mes: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m')`,
      total: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
    })
      .from(orders)
      .where(and(gte(orders.createdAt, cienToOitentaDiasAtras), eq(orders.pagamentoStatus, 'aprovado')))
      .groupBy(sql`DATE_FORMAT(${orders.createdAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${orders.createdAt}, '%Y-%m')`),
  ])

  // Preencher dias faltantes nos últimos 7 dias
  const dailyMap = new Map(dailyRaw.map(r => [r.dia, Number(r.total)]))
  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seisDiasAtras)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    return { label, total: dailyMap.get(key) ?? 0 }
  })

  // Semanas
  const weekly = weeklyRaw.map((r, i) => ({
    label: `Sem ${i + 1}`,
    total: Number(r.total),
  }))

  // Meses
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const monthly = monthlyRaw.map(r => ({
    label: MESES[parseInt(r.mes.slice(5, 7)) - 1],
    total: Number(r.total),
  }))

  return { pedidosHoje, receitaHoje, produtosAtivos, pedidosPendentes, semImagem, daily, weekly, monthly }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  const cards = [
    {
      label: 'Pedidos hoje',
      value: String(stats.pedidosHoje),
      icon: 'receipt_long',
      color: 'text-primary',
      href: '/admin/pedidos?data=hoje',
    },
    {
      label: 'Receita hoje',
      value: stats.receitaHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: 'payments',
      color: 'text-secondary',
      href: null,
    },
    {
      label: 'Produtos ativos',
      value: stats.produtosAtivos.toLocaleString('pt-BR'),
      icon: 'inventory_2',
      color: 'text-tertiary',
      href: '/admin/produtos?ativo=true',
    },
    {
      label: 'Pedidos pendentes',
      value: String(stats.pedidosPendentes),
      icon: 'pending_actions',
      color: 'text-error',
      href: '/admin/pedidos?status=pendente',
    },
    {
      label: 'Sem imagem',
      value: stats.semImagem.toLocaleString('pt-BR'),
      icon: 'image_not_supported',
      color: 'text-amber-500',
      href: '/admin/produtos?semImagem=true&ativo=true',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface">Dashboard</h1>
        <p className="text-on-surface-variant text-sm mt-1">Visão geral do Super Millas</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {cards.map(card => {
          const inner = (
            <>
              <span className={`material-symbols-outlined text-[28px] filled ${card.color}`}>{card.icon}</span>
              <p className="text-2xl font-headline font-extrabold text-on-surface mt-3">{card.value}</p>
              <p className="text-xs text-on-surface-variant mt-1">{card.label}</p>
              {card.href && (
                <p className="text-[10px] text-primary mt-2 font-medium">Ver →</p>
              )}
            </>
          )
          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 hover:border-primary/30 hover:bg-surface-container-low transition-colors block"
            >
              {inner}
            </Link>
          ) : (
            <div key={card.label} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
              {inner}
            </div>
          )
        })}
      </div>

      {stats.semImagem > 0 && (
        <Link
          href="/admin/produtos?semImagem=true&ativo=true"
          className="flex items-center gap-4 p-5 rounded-2xl bg-amber-500 border border-amber-600 mb-6 group"
        >
          <span className="material-symbols-outlined text-white text-[32px] filled shrink-0">image_not_supported</span>
          <div className="flex-1">
            <p className="text-white font-bold text-base leading-tight">{stats.semImagem} produto{stats.semImagem !== 1 ? 's' : ''} sem imagem</p>
            <p className="text-amber-100 text-sm mt-0.5">Clique para ver e adicionar fotos</p>
          </div>
          <span className="material-symbols-outlined text-white text-[22px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </Link>
      )}

      <RevenueChart
        daily={stats.daily}
        weekly={stats.weekly}
        monthly={stats.monthly}
      />
    </div>
  )
}
