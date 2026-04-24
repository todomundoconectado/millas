'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface DataPoint {
  label: string
  total: number
}

interface Props {
  daily: DataPoint[]
  weekly: DataPoint[]
  monthly: DataPoint[]
}

const TABS = [
  { key: 'daily', label: '7 dias' },
  { key: 'weekly', label: '4 semanas' },
  { key: 'monthly', label: '6 meses' },
] as const

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RevenueChart({ daily, weekly, monthly }: Props) {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  const data = tab === 'daily' ? daily : tab === 'weekly' ? weekly : monthly
  const total = data.reduce((s, d) => s + d.total, 0)

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-on-surface">Receita</h2>
          <p className="text-2xl font-headline font-extrabold text-primary mt-0.5">{formatBRL(total)}</p>
          <p className="text-xs text-on-surface-variant">
            {tab === 'daily' ? 'Últimos 7 dias' : tab === 'weekly' ? 'Últimas 4 semanas' : 'Últimos 6 meses'}
          </p>
        </div>

        <div className="flex gap-1 bg-surface-container rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tab === t.key
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#206223" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#206223" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#40493d' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#40493d' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              formatter={(value) => [formatBRL(Number(value ?? 0)), 'Receita']}
              contentStyle={{
                background: '#ffffff',
                border: '1px solid rgba(191,202,186,0.3)',
                borderRadius: '12px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#206223"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#206223' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.length === 0 && (
        <p className="text-center text-sm text-on-surface-variant -mt-44">Nenhum pedido aprovado no período.</p>
      )}
    </div>
  )
}
