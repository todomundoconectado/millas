export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrderById } from '@/lib/db/queries/orders'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { orderStatuses } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'

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

const PAGAMENTO_LABELS: Record<string, string> = {
  pix: 'PIX',
  cartao: 'Cartão de crédito',
  boleto: 'Boleto bancário',
}

const PAGAMENTO_STATUS_LABELS: Record<string, string> = {
  aguardando: 'Aguardando',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  reembolsado: 'Reembolsado',
}

async function updateOrderStatus(formData: FormData) {
  'use server'
  const id = Number(formData.get('id'))
  const status = formData.get('status') as typeof orderStatuses[number]
  if (!id || !status) return
  await db.update(orders).set({ status }).where(eq(orders.id, id))
  revalidatePath(`/admin/pedidos/${id}`)
  revalidatePath('/admin/pedidos')
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminPedidoDetalhe({ params }: Props) {
  const { id } = await params
  const orderId = parseInt(id)
  if (isNaN(orderId)) notFound()

  const order = await getOrderById(orderId)
  if (!order) notFound()

  const subtotal = parseFloat(String(order.subtotal))
  const desconto = parseFloat(String(order.desconto))
  const frete = parseFloat(String(order.frete))
  const total = parseFloat(String(order.total))

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/pedidos"
          className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Pedidos
        </Link>
        <span className="text-on-surface-variant">/</span>
        <span className="text-sm text-on-surface font-medium">#{order.numero}</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">
            Pedido #{order.numero}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {new Date(order.createdAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="lg:ml-auto flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Itens */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/20">
              <h2 className="font-headline font-bold text-base text-on-surface">Itens do pedido</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container">
                    <th className="text-left px-5 py-2.5 font-bold text-on-surface-variant text-xs uppercase">Produto</th>
                    <th className="text-center px-4 py-2.5 font-bold text-on-surface-variant text-xs uppercase">Qtd</th>
                    <th className="text-right px-4 py-2.5 font-bold text-on-surface-variant text-xs uppercase">Preço unit.</th>
                    <th className="text-right px-5 py-2.5 font-bold text-on-surface-variant text-xs uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {order.items.map((item) => {
                    const qtd = parseFloat(String(item.quantidade))
                    const preco = parseFloat(String(item.precoSnapshot))
                    const sub = parseFloat(String(item.subtotal))
                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-on-surface">{item.nomeSnapshot}</p>
                          {item.isKg && (
                            <p className="text-xs text-on-surface-variant">Vendido por kg</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-on-surface-variant">
                          {item.isKg
                            ? `${qtd.toFixed(3).replace('.', ',')} kg`
                            : qtd.toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-right text-on-surface-variant">
                          {fmt(preco)}{item.isKg ? '/kg' : ''}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-on-surface">
                          {fmt(sub)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Totais */}
            <div className="px-5 py-4 border-t border-outline-variant/20 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-primary font-medium">
                  <span>Desconto</span><span>- {fmt(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-on-surface-variant">
                <span>Frete</span><span>{frete === 0 ? 'Grátis' : fmt(frete)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base text-on-surface pt-2 border-t border-outline-variant/20 mt-1">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Entrega */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <h2 className="font-headline font-bold text-base text-on-surface mb-4">Entrega</h2>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Endereço</p>
                <p className="text-on-surface font-medium">
                  {order.endereco.logradouro}, {order.endereco.numero}
                  {order.endereco.complemento ? ` – ${order.endereco.complemento}` : ''}
                </p>
                <p className="text-on-surface-variant">
                  {order.endereco.bairro}, {order.endereco.cidade}/{order.endereco.estado} — CEP {order.endereco.cep}
                </p>
              </div>
              {order.deliverySlot && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Horário de entrega</p>
                  <p className="text-on-surface font-medium">{order.deliverySlot.label}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-5">
          {/* Cliente */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <h2 className="font-headline font-bold text-base text-on-surface mb-4">Cliente</h2>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Nome</p>
                <p className="font-medium text-on-surface">{order.clienteNome}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Telefone</p>
                <a
                  href={`https://wa.me/55${order.clienteTelefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-on-surface hover:text-primary transition-colors"
                >
                  {order.clienteTelefone}
                </a>
              </div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <h2 className="font-headline font-bold text-base text-on-surface mb-4">Pagamento</h2>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Forma</p>
                <p className="font-medium text-on-surface">
                  {PAGAMENTO_LABELS[order.pagamentoTipo] ?? order.pagamentoTipo}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Status do pagamento</p>
                <p className="font-medium text-on-surface">
                  {PAGAMENTO_STATUS_LABELS[order.pagamentoStatus] ?? order.pagamentoStatus}
                </p>
              </div>
            </div>
          </div>

          {/* Alterar status */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <h2 className="font-headline font-bold text-base text-on-surface mb-4">Alterar status</h2>
            <form action={updateOrderStatus} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {(Object.keys(STATUS_LABELS) as typeof orderStatuses[number][]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl btn-primary-gradient text-on-primary font-bold text-sm transition-opacity hover:opacity-90"
              >
                Salvar status
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
