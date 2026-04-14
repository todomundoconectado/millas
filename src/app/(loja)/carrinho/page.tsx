'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/store/cart'
import { formatBRL, buscarCEP } from '@/lib/formatters'
import PriceDisplay from '@/components/ui/PriceDisplay'

// ── KG Warning Modal ───────────────────────────────────────────────────────

function KgWarningModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl p-7 max-w-md w-full shadow-2xl shadow-on-secondary-fixed/10">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-3xl text-secondary filled">scale</span>
          <h2 className="text-xl font-headline font-extrabold text-on-surface">Atenção: produtos por quilo</h2>
        </div>

        <p className="text-on-surface-variant leading-relaxed mb-6">
          Seu pedido contém produtos vendidos <strong className="text-on-surface">por peso (kg)</strong>.
          O valor exibido agora é uma <strong className="text-on-surface">estimativa</strong> — o preço final
          será calculado com base no <strong className="text-on-surface">peso real</strong> pesado na separação.
          <br /><br />
          Isso é normal e acontece porque cada peça tem um peso diferente. Não se preocupe: você sempre
          pagará pelo peso exato que receber, nunca mais do que o combinado por kg.
        </p>

        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary"
          />
          <span className="text-sm text-on-surface leading-relaxed">
            Entendi que o valor final dos produtos por kg pode ser diferente do estimado aqui.
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors"
          >
            Voltar ao carrinho
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed}
            className="flex-1 py-3 rounded-xl btn-primary-gradient text-on-primary font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delivery Slots ─────────────────────────────────────────────────────────

const SLOTS = [
  { id: '1', label: 'Hoje', hora: '14h – 18h', gratis: true },
  { id: '2', label: 'Hoje', hora: '18h – 22h', gratis: true },
  { id: '3', label: 'Amanhã', hora: '08h – 12h', gratis: true },
  { id: '4', label: 'Amanhã', hora: '12h – 16h', gratis: true },
]

// ── Cart Page ──────────────────────────────────────────────────────────────

type Step = 'carrinho' | 'entrega' | 'pagamento' | 'confirmacao'

export default function CarrinhoPage() {
  const { items, coupon, updateQty, removeItem, applyCoupon, removeCoupon, clear,
    subtotal, desconto, frete, total, hasKgItems } = useCart()

  const [step, setStep] = useState<Step>('carrinho')
  const [showKgModal, setShowKgModal] = useState(false)
  const [slotId, setSlotId] = useState('1')
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')

  const [endereco, setEndereco] = useState({
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  })
  const [cepLoading, setCepLoading] = useState(false)
  const [pagamento, setPagamento] = useState<'pix' | 'cartao' | 'boleto'>('pix')

  async function handleCEP(cep: string) {
    setEndereco(e => ({ ...e, cep }))
    if (cep.replace(/\D/g, '').length === 8) {
      setCepLoading(true)
      const data = await buscarCEP(cep)
      if (data) {
        setEndereco(e => ({ ...e, logradouro: data.logradouro, bairro: data.bairro, cidade: data.cidade, estado: data.estado }))
      }
      setCepLoading(false)
    }
  }

  function handleCheckout() {
    if (hasKgItems()) {
      setShowKgModal(true)
    } else {
      setStep('entrega')
    }
  }

  async function handleCoupon() {
    // TODO: validar via Server Action
    setCouponError('Cupom não encontrado ou expirado.')
  }

  if (items.length === 0 && step === 'carrinho') {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-20 text-center">
        <span className="material-symbols-outlined text-8xl text-outline-variant">shopping_cart</span>
        <h2 className="text-2xl font-headline font-extrabold text-on-surface mt-6 mb-3">Seu carrinho está vazio</h2>
        <p className="text-on-surface-variant mb-8">Adicione produtos para começar as compras.</p>
        <Link href="/produtos" className="inline-flex items-center gap-2 btn-primary-gradient text-on-primary px-8 py-3.5 rounded-full font-bold">
          <span className="material-symbols-outlined text-[20px]">storefront</span>
          Ver produtos
        </Link>
      </div>
    )
  }

  return (
    <>
      {showKgModal && (
        <KgWarningModal
          onConfirm={() => { setShowKgModal(false); setStep('entrega') }}
          onCancel={() => setShowKgModal(false)}
        />
      )}

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface mb-8">
          {step === 'carrinho' && 'Seu Carrinho'}
          {step === 'entrega' && 'Dados de Entrega'}
          {step === 'pagamento' && 'Pagamento'}
          {step === 'confirmacao' && 'Pedido Confirmado!'}
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Conteúdo principal ── */}
          <div className="flex-1 flex flex-col gap-6">
            {/* STEP: Carrinho */}
            {step === 'carrinho' && (
              <>
                {/* Itens */}
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container transition-colors group"
                    >
                      {/* Imagem placeholder */}
                      <div className="w-20 h-20 rounded-xl bg-surface-container shrink-0 flex items-center justify-center overflow-hidden">
                        {item.imagem ? (
                          <img src={item.imagem} alt={item.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-outline-variant">image</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/produtos/${item.slug}`} className="font-headline font-bold text-on-surface hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {item.nome}
                        </Link>
                        {item.isKg && (
                          <span className="text-xs text-on-surface-variant">Aprox. {item.quantidade} kg</span>
                        )}
                        {/* Qty selector */}
                        <div className="flex items-center gap-0 bg-surface-container rounded-full px-1 py-0.5 w-fit mt-2">
                          <button onClick={() => updateQty(item.productId, item.quantidade - (item.isKg ? 0.5 : 1))}
                            className="w-7 h-7 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </button>
                          <span className="w-8 text-center text-sm font-semibold select-none">
                            {item.isKg ? item.quantidade.toFixed(1) : item.quantidade}
                          </span>
                          <button onClick={() => updateQty(item.productId, item.quantidade + (item.isKg ? 0.5 : 1))}
                            className="w-7 h-7 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                      </div>

                      {/* Preço + remover */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-headline font-extrabold text-lg text-primary">
                          {formatBRL(item.preco * item.quantidade)}
                        </span>
                        <button onClick={() => removeItem(item.productId)}
                          className="text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cupom */}
                <div className="p-5 rounded-xl bg-surface-container-low">
                  <p className="text-sm font-bold text-on-surface mb-3">Cupom de desconto</p>
                  {coupon ? (
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px] filled">sell</span>
                        <span className="font-bold text-primary">{coupon.codigo}</span>
                        <span className="text-sm text-on-surface-variant">– {formatBRL(desconto())}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Digite seu cupom"
                        className="flex-1 bg-surface-container-highest rounded-full py-2.5 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        onClick={handleCoupon}
                        className="px-5 py-2.5 rounded-full btn-primary-gradient text-on-primary text-sm font-bold"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-error mt-2">{couponError}</p>}
                </div>

                {/* Horário de entrega */}
                <div className="p-5 rounded-xl bg-surface-container-low">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-[22px]">schedule</span>
                    <h3 className="font-headline font-bold text-on-surface">Escolha o horário de entrega</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SLOTS.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSlotId(slot.id)}
                        className={`p-4 rounded-xl text-left transition-all border-2 ${
                          slotId === slot.id
                            ? 'border-primary bg-primary/5'
                            : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[18px] mb-1 ${slotId === slot.id ? 'text-primary filled' : 'text-on-surface-variant'}`}>
                          {slotId === slot.id ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{slot.label}</p>
                        <p className="font-bold text-on-surface text-sm">{slot.hora}</p>
                        <p className="text-xs text-primary font-medium mt-0.5">{slot.gratis ? 'Grátis' : ''}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* STEP: Entrega */}
            {step === 'entrega' && (
              <div className="p-6 rounded-xl bg-surface-container-lowest flex flex-col gap-4">
                <h2 className="font-headline font-bold text-lg text-on-surface">Endereço de entrega</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">CEP</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={endereco.cep}
                        onChange={(e) => handleCEP(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full bg-surface-container rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {cepLoading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant animate-spin">sync</span>
                      )}
                    </div>
                  </div>

                  {[
                    { key: 'logradouro', label: 'Rua / Logradouro', span: 2 },
                    { key: 'numero', label: 'Número', span: 1 },
                    { key: 'complemento', label: 'Complemento (opcional)', span: 1 },
                    { key: 'bairro', label: 'Bairro', span: 1 },
                    { key: 'cidade', label: 'Cidade', span: 1 },
                  ].map(({ key, label, span }) => (
                    <div key={key} className={span === 2 ? 'sm:col-span-2' : ''}>
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">{label}</label>
                      <input
                        type="text"
                        value={(endereco as any)[key]}
                        onChange={(e) => setEndereco(a => ({ ...a, [key]: e.target.value }))}
                        className="w-full bg-surface-container rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">Nome completo</label>
                    <input type="text" className="w-full bg-surface-container rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">Telefone</label>
                    <input type="tel" placeholder="(11) 99999-8888" className="w-full bg-surface-container rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>

                <button onClick={() => setStep('pagamento')} className="btn-primary-gradient text-on-primary py-4 rounded-xl font-bold w-full mt-2">
                  Continuar para pagamento
                </button>
              </div>
            )}

            {/* STEP: Pagamento */}
            {step === 'pagamento' && (
              <div className="p-6 rounded-xl bg-surface-container-lowest flex flex-col gap-4">
                <h2 className="font-headline font-bold text-lg text-on-surface">Forma de pagamento</h2>

                <div className="flex flex-col gap-2">
                  {([
                    { id: 'pix', label: 'PIX', icon: 'qr_code_2', desc: 'Aprovação instantânea' },
                    { id: 'cartao', label: 'Cartão de Crédito', icon: 'credit_card', desc: 'Até 12x sem juros' },
                    { id: 'boleto', label: 'Boleto Bancário', icon: 'receipt', desc: 'Vence em 2 dias úteis' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setPagamento(opt.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        pagamento === opt.id
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant/20 hover:border-outline-variant/40'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-2xl ${pagamento === opt.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {opt.icon}
                      </span>
                      <div>
                        <p className="font-bold text-on-surface">{opt.label}</p>
                        <p className="text-xs text-on-surface-variant">{opt.desc}</p>
                      </div>
                      <span className={`material-symbols-outlined ml-auto ${pagamento === opt.id ? 'text-primary filled' : 'text-outline-variant'}`}>
                        {pagamento === opt.id ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep('confirmacao')}
                  className="btn-primary-gradient text-on-primary py-4 rounded-xl font-bold w-full mt-2 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-[22px]">check_circle</span>
                  Finalizar pedido
                </button>
              </div>
            )}

            {/* STEP: Confirmação */}
            {step === 'confirmacao' && (
              <div className="flex flex-col items-center text-center gap-6 py-12">
                <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-primary filled">check_circle</span>
                </div>
                <div>
                  <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-2">Pedido realizado com sucesso!</h2>
                  <p className="text-on-surface-variant">
                    Seu pedido foi recebido e está sendo preparado. Você receberá uma confirmação por WhatsApp.
                  </p>
                </div>
                {pagamento === 'pix' && (
                  <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant/20 w-full max-w-xs">
                    <p className="text-sm font-bold text-on-surface mb-3">Pague via PIX</p>
                    <div className="w-48 h-48 bg-surface-container rounded-xl mx-auto flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-outline-variant">qr_code_2</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-3">QR Code gerado após confirmação do pedido</p>
                  </div>
                )}
                <Link href="/" className="btn-primary-gradient text-on-primary px-8 py-3.5 rounded-full font-bold">
                  Voltar para o início
                </Link>
              </div>
            )}
          </div>

          {/* ── Order Summary ── */}
          {step !== 'confirmacao' && (
            <aside className="w-full lg:w-96 shrink-0">
              <div className="sticky top-28 p-7 rounded-3xl bg-surface-container-lowest shadow-2xl shadow-on-secondary-fixed/5 border border-outline-variant/10">
                <h2 className="text-xl font-headline font-bold text-on-surface mb-6">Resumo do pedido</h2>

                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex justify-between text-on-surface-variant text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium text-on-surface">{formatBRL(subtotal())}</span>
                  </div>
                  {desconto() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">Desconto</span>
                      <span className="font-medium text-primary">– {formatBRL(desconto())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Frete</span>
                    <span className={frete() === 0 ? 'text-primary font-medium' : 'text-on-surface font-medium'}>
                      {frete() === 0 ? 'GRÁTIS' : formatBRL(frete())}
                    </span>
                  </div>
                  <div className="pt-3 mt-1 border-t border-outline-variant/20 flex justify-between items-baseline">
                    <span className="font-bold text-on-surface">Total</span>
                    <span className="text-2xl font-headline font-black text-primary">{formatBRL(total())}</span>
                  </div>
                </div>

                {step === 'carrinho' && (
                  <button
                    onClick={handleCheckout}
                    className="w-full py-4 rounded-xl btn-primary-gradient text-on-primary font-bold text-base shadow-lg shadow-primary/20 hover:opacity-92 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
                    Finalizar compra
                  </button>
                )}

                {step !== 'carrinho' && (
                  <button
                    onClick={() => setStep('carrinho')}
                    className="w-full py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors"
                  >
                    ← Voltar ao carrinho
                  </button>
                )}

                <div className="mt-6 pt-6 border-t border-outline-variant/10 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[22px]">verified_user</span>
                    <span className="text-xs text-on-surface-variant">Compra 100% segura e criptografada</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[22px]">eco</span>
                    <span className="text-xs text-on-surface-variant">Entrega sustentável e embalagem reciclável</span>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  )
}
