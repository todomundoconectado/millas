import Link from 'next/link'

export default function AdminProdutos() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">Produtos</h1>
          <p className="text-on-surface-variant text-sm mt-1">Gerencie o catálogo</p>
        </div>
        <Link
          href="/admin/produtos/novo"
          className="btn-primary-gradient text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo produto
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
        <p className="text-on-surface-variant text-sm text-center py-8">
          Conecte o banco de dados para listar os produtos.
        </p>
      </div>
    </div>
  )
}
