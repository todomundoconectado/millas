'use server'

import { db } from '@/lib/db'
import { coupons } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export type CouponResult =
  | { error: string }
  | { coupon: { id: number; codigo: string; tipo: 'percentual' | 'valor_fixo' | 'frete_gratis'; valor: number } }

export async function validateCoupon(codigo: string, subtotal: number): Promise<CouponResult> {
  if (!codigo.trim()) return { error: 'Digite um código de cupom.' }

  try {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.codigo, codigo.toUpperCase().trim()),
          eq(coupons.ativo, true)
        )
      )
      .limit(1)

    if (!coupon) return { error: 'Cupom não encontrado ou inválido.' }

    if (coupon.validade && new Date(coupon.validade) < new Date()) {
      return { error: 'Este cupom está expirado.' }
    }

    if (coupon.usosMax != null && coupon.usosAtuais >= coupon.usosMax) {
      return { error: 'Este cupom atingiu o limite de usos.' }
    }

    const pedidoMin = coupon.pedidoMinimo ? parseFloat(String(coupon.pedidoMinimo)) : 0
    if (pedidoMin > 0 && subtotal < pedidoMin) {
      return {
        error: `Pedido mínimo para este cupom: R$ ${pedidoMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      }
    }

    return {
      coupon: {
        id: coupon.id,
        codigo: coupon.codigo,
        tipo: coupon.tipo,
        valor: parseFloat(String(coupon.valor ?? '0')),
      },
    }
  } catch {
    return { error: 'Erro ao validar cupom. Tente novamente.' }
  }
}
