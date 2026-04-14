export default function AdminDashboard() {
  const stats = [
    { label: 'Pedidos hoje', value: '—', icon: 'receipt_long', color: 'text-primary' },
    { label: 'Receita hoje', value: '—', icon: 'payments', color: 'text-secondary' },
    { label: 'Produtos ativos', value: '—', icon: 'inventory_2', color: 'text-tertiary' },
    { label: 'Pedidos pendentes', value: '—', icon: 'pending_actions', color: 'text-error' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface">Dashboard</h1>
        <p className="text-on-surface-variant text-sm mt-1">Visão geral do Super Millas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
            <span className={`material-symbols-outlined text-[28px] filled ${stat.color}`}>{stat.icon}</span>
            <p className="text-2xl font-headline font-extrabold text-on-surface mt-3">{stat.value}</p>
            <p className="text-xs text-on-surface-variant mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20">
        <p className="text-on-surface-variant text-sm text-center py-8">
          Conecte o banco de dados para ver os dados em tempo real.
        </p>
      </div>
    </div>
  )
}
