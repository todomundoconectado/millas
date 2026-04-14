export default function AdminPedidos() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-headline font-extrabold text-on-surface">Pedidos</h1>
        <p className="text-on-surface-variant text-sm mt-1">Gerencie e separe os pedidos</p>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
        <p className="text-on-surface-variant text-sm text-center py-8">
          Conecte o banco de dados para listar os pedidos.
        </p>
      </div>
    </div>
  )
}
