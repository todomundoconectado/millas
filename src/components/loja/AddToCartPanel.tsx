'use client'

import { useState } from 'react'
import PriceDisplay from '@/components/ui/PriceDisplay'
import { useCart } from '@/lib/store/cart'

interface Props {
  id: number
  nome: string
  slug: string
  preco: string
  precoDe: string | null
  imagens: string[]
  isKg: boolean
}

export default function AddToCartPanel({ id, nome, slug, preco, precoDe, imagens, isKg }: Props) {
  const addItem = useCart((s) => s.addItem)
  const [quantidade, setQtd] = useState(1)
  const [added, setAdded] = useState(false)

  function handleAdd() {
    addItem({
      productId: id,
      nome,
      preco: parseFloat(preco),
      quantidade,
      isKg,
      imagem: imagens[0] ?? null,
      slug,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <PriceDisplay preco={preco} precoDe={precoDe} size="lg" />

      {isKg && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-secondary-container/30">
          <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">info</span>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Este produto é vendido por kg. O preço exibido é por quilograma. O valor final será calculado com base no peso real na entrega.
          </p>
        </div>
      )}

      <div className="p-6 rounded-xl bg-surface-container-low flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-3">
            {isKg ? 'Quantidade (aprox. kg)' : 'Quantidade'}
          </label>
          <div className="flex items-center gap-0 bg-surface-container-lowest rounded-full border border-outline-variant/20 w-fit">
            <button
              onClick={() => setQtd(q => Math.max(1, q - 1))}
              className="w-12 h-12 flex items-center justify-center text-on-surface hover:text-primary transition-colors rounded-l-full"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <span className="w-14 text-center font-bold text-lg select-none">{quantidade}</span>
            <button
              onClick={() => setQtd(q => q + 1)}
              className="w-12 h-12 flex items-center justify-center text-on-surface hover:text-primary transition-colors rounded-r-full"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleAdd}
          className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 ${
            added
              ? 'bg-primary-fixed text-on-primary-fixed'
              : 'btn-primary-gradient text-on-primary hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px] filled">
            {added ? 'check_circle' : 'add_shopping_cart'}
          </span>
          {added ? 'Adicionado ao carrinho!' : 'Adicionar ao carrinho'}
        </button>

        <p className="text-xs text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px] text-primary align-middle mr-1 filled">local_shipping</span>
          Frete grátis em compras acima de R$ 150,00
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: 'verified_user', text: 'Pagamento seguro' },
          { icon: 'eco', text: 'Produto fresco' },
        ].map(item => (
          <div key={item.icon} className="flex items-center gap-2 p-3 rounded-xl border border-outline-variant/20">
            <span className="material-symbols-outlined text-primary-container text-[22px]">{item.icon}</span>
            <span className="text-xs text-on-surface-variant font-medium">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
