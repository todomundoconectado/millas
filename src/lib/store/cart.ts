'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: number
  nome: string
  preco: number
  quantidade: number
  isKg: boolean
  imagem: string | null
  slug: string
}

export interface Coupon {
  id: number
  codigo: string
  tipo: 'percentual' | 'valor_fixo' | 'frete_gratis'
  valor: number | null
}

interface CartStore {
  items: CartItem[]
  coupon: Coupon | null

  addItem: (item: Omit<CartItem, 'quantidade'> & { quantidade?: number }) => void
  removeItem: (productId: number) => void
  updateQty: (productId: number, quantidade: number) => void
  applyCoupon: (coupon: Coupon) => void
  removeCoupon: () => void
  clear: () => void

  // Derived
  itemCount: () => number
  subtotal: () => number
  desconto: () => number
  frete: () => number
  total: () => number
  hasKgItems: () => boolean
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,

      addItem: (item) => {
        const { items } = get()
        const existing = items.find(i => i.productId === item.productId)
        if (existing) {
          set({
            items: items.map(i =>
              i.productId === item.productId
                ? { ...i, quantidade: i.quantidade + (item.quantidade ?? 1) }
                : i
            ),
          })
        } else {
          set({ items: [...items, { ...item, quantidade: item.quantidade ?? 1 }] })
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.productId !== productId) })
      },

      updateQty: (productId, quantidade) => {
        if (quantidade <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map(i =>
            i.productId === productId ? { ...i, quantidade } : i
          ),
        })
      },

      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),
      clear: () => set({ items: [], coupon: null }),

      itemCount: () => get().items.reduce((sum, i) => sum + (i.isKg ? 1 : i.quantidade), 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.preco * i.quantidade, 0),

      desconto: () => {
        const { coupon, subtotal } = get()
        if (!coupon) return 0
        if (coupon.tipo === 'percentual' && coupon.valor) {
          return (subtotal() * coupon.valor) / 100
        }
        if (coupon.tipo === 'valor_fixo' && coupon.valor) {
          return Math.min(coupon.valor, subtotal())
        }
        return 0
      },

      frete: () => {
        const { coupon, subtotal } = get()
        if (coupon?.tipo === 'frete_gratis') return 0
        if (subtotal() >= 150) return 0
        return 8.9
      },

      total: () => {
        const { subtotal, desconto, frete } = get()
        return Math.max(0, subtotal() - desconto() + frete())
      },

      hasKgItems: () => get().items.some(i => i.isKg),
    }),
    {
      name: 'supermillas-cart',
      version: 1,
    }
  )
)
