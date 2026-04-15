import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrderByNumero } from '@/lib/db/queries/orders'

interface ObrigadoPageProps {
  searchParams: Promise<{ pedido?: string }>
}

export default async function ObrigadoPage({ searchParams }: ObrigadoPageProps) {
  const { pedido } = await searchParams

  if (!pedido) notFound()

  const order = await getOrderByNumero(pedido)
  if (!order) notFound()

  const itensTexto = order.items
    .map((item) => {
      const qtd = parseFloat(String(item.quantidade))
      const isKg = item.isKg
      const qtdStr = isKg
        ? `${qtd.toFixed(3).replace('.', ',')} kg`
        : `${qtd.toFixed(0)}x`
      return `${qtdStr} ${item.nomeSnapshot}`
    })
    .join(', ')

  const totalStr = parseFloat(String(order.total)).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const mensagemWpp = encodeURIComponent(
    `Olá! Gostaria de confirmar meu pedido #${order.numero}.\nItens: ${itensTexto}.\nTotal: ${totalStr}.`
  )
  const whatsappUrl = `https://wa.me/5519988030096?text=${mensagemWpp}`

  const subtotal = parseFloat(String(order.subtotal))
  const desconto = parseFloat(String(order.desconto))
  const frete = parseFloat(String(order.frete))
  const total = parseFloat(String(order.total))

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const pagamentoLabel: Record<string, string> = {
    pix: 'PIX',
    cartao: 'Cartão de crédito',
    boleto: 'Boleto bancário',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
      {/* Ícone de sucesso */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface mb-2">
          Pedido recebido!
        </h1>
        <p className="text-on-surface-variant text-base">
          Número do pedido:{' '}
          <span className="font-bold text-on-surface">{order.numero}</span>
        </p>
      </div>

      {/* Card principal */}
      <div className="bg-surface-container rounded-3xl overflow-hidden mb-6">
        {/* Itens */}
        <div className="p-6 border-b border-outline-variant/20">
          <h2 className="font-headline font-bold text-base text-on-surface mb-4">
            Itens do pedido
          </h2>
          <ul className="flex flex-col gap-3">
            {order.items.map((item) => {
              const qtd = parseFloat(String(item.quantidade))
              const preco = parseFloat(String(item.precoSnapshot))
              const sub = parseFloat(String(item.subtotal))
              return (
                <li key={item.id} className="flex items-center gap-3">
                  {item.imagemSnapshot ? (
                    <img
                      src={item.imagemSnapshot}
                      alt={item.nomeSnapshot}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 bg-surface-container-high"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-outline-variant text-xl">
                        inventory_2
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface leading-tight line-clamp-1">
                      {item.nomeSnapshot}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {item.isKg
                        ? `${qtd.toFixed(3).replace('.', ',')} kg × ${fmt(preco)}/kg`
                        : `${qtd.toFixed(0)} × ${fmt(preco)}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-on-surface shrink-0">
                    {fmt(sub)}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Totais */}
        <div className="p-6 border-b border-outline-variant/20 flex flex-col gap-2">
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {desconto > 0 && (
            <div className="flex justify-between text-sm text-[color-mix(in_srgb,var(--color-primary)_80%,var(--color-on-surface))]">
              <span>Desconto</span>
              <span>- {fmt(desconto)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>Frete</span>
            <span>{frete === 0 ? 'Grátis' : fmt(frete)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-on-surface pt-2 border-t border-outline-variant/20 mt-1">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        {/* Detalhes */}
        <div className="p-6 flex flex-col gap-3 text-sm">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-on-surface-variant text-base mt-0.5">
              payments
            </span>
            <div>
              <p className="text-on-surface-variant text-xs mb-0.5">Pagamento</p>
              <p className="font-medium text-on-surface">
                {pagamentoLabel[order.pagamentoTipo] ?? order.pagamentoTipo}
              </p>
            </div>
          </div>

          {order.deliverySlot && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-base mt-0.5">
                schedule
              </span>
              <div>
                <p className="text-on-surface-variant text-xs mb-0.5">Entrega</p>
                <p className="font-medium text-on-surface">{order.deliverySlot.label}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <span className="material-symbols-outlined text-on-surface-variant text-base mt-0.5">
              location_on
            </span>
            <div>
              <p className="text-on-surface-variant text-xs mb-0.5">Endereço</p>
              <p className="font-medium text-on-surface">
                {order.endereco.logradouro}, {order.endereco.numero}
                {order.endereco.complemento ? ` – ${order.endereco.complemento}` : ''},{' '}
                {order.endereco.bairro}, {order.endereco.cidade}/{order.endereco.estado}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Aviso WhatsApp */}
      <div className="bg-[color-mix(in_srgb,#25D366_10%,transparent)] border border-[#25D366]/30 rounded-2xl p-5 mb-6 text-center">
        <p className="text-sm text-on-surface mb-1 font-medium">
          Confirme seu pedido pelo WhatsApp
        </p>
        <p className="text-xs text-on-surface-variant">
          Nossa equipe confirmará em breve após receber sua mensagem.
        </p>
      </div>

      {/* Botões */}
      <div className="flex flex-col gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: '#25D366' }}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Confirmar pedido pelo WhatsApp
        </a>

        <Link
          href="/produtos"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-medium text-sm text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-base">storefront</span>
          Continuar comprando
        </Link>
      </div>
    </div>
  )
}
