'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/store/cart'
import PriceDisplay from '@/components/ui/PriceDisplay'

interface ProductCardProps {
  id: number
  nome: string
  slug: string
  preco: number | string
  precoDe?: number | string | null
  imagens: string[]
  isKg: boolean
  categoriaId?: number | null
  badge?: string
}

export default function ProductCard({
  id,
  nome,
  slug,
  preco,
  precoDe,
  imagens,
  isKg,
  badge,
}: ProductCardProps) {
  const addItem = useCart((s) => s.addItem)

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      productId: id,
      nome,
      preco: parseFloat(String(preco)),
      isKg,
      imagem: imagens[0] ?? null,
      slug,
    })
  }

  const imgSrc = imagens[0] ?? null

  return (
    <Link href={`/produtos/${slug}`} className="group block">
      <article className="product-card flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden h-full">
        {/* Imagem */}
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-container shrink-0">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={nome}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container">
              <span className="material-symbols-outlined text-6xl text-outline-variant">image</span>
            </div>
          )}

          {/* Badge */}
          {badge && (
            <span className="absolute top-3 left-3 text-[10px] px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-bold uppercase tracking-wider">
              {badge}
            </span>
          )}

          {/* Kg badge */}
          {isKg && (
            <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-surface-container-lowest/90 text-on-surface-variant font-medium border border-outline-variant/20">
              /kg
            </span>
          )}

          {/* Botão flutuante add */}
          <button
            onClick={handleAddToCart}
            aria-label={`Adicionar ${nome} ao carrinho`}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full btn-primary-gradient text-on-primary flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-primary/30"
          >
            <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          </button>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="font-headline font-bold text-base text-on-surface line-clamp-2 leading-snug">
            {nome}
          </h3>
          <div className="mt-auto flex items-end justify-between gap-2">
            <PriceDisplay preco={preco} precoDe={precoDe} size="sm" />
            <button
              onClick={handleAddToCart}
              aria-label={`Adicionar ${nome} ao carrinho`}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-primary-gradient text-on-primary text-xs font-bold transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
        </div>
      </article>
    </Link>
  )
}
