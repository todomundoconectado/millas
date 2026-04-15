'use server'

import { db } from '@/lib/db'
import { orders, orderItems, coupons } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export interface OrderPayload {
  items: Array<{
    productId: number
    nome: string
    preco: number
    quantidade: number
    isKg: boolean
    imagem: string | null
    slug: string
  }>
  clienteNome: string
  clienteTelefone: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    estado: string
  }
  deliverySlot: { data: string; hora: string; label: string }
  pagamentoTipo: 'pix' | 'cartao' | 'boleto'
  couponId?: number
  subtotal: number
  desconto: number
  frete: number
  total: number
}

function gerarNumero(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `SM-${y}${m}${d}-${rand}`
}

export async function createOrder(
  payload: OrderPayload
): Promise<{ success: true; numero: string; orderId: number } | { success: false; error: string }> {
  try {
    if (!payload.items.length) return { success: false, error: 'Carrinho vazio.' }

    const numero = gerarNumero()

    // Insert order
    await db.insert(orders).values({
      numero,
      clienteNome: payload.clienteNome,
      clienteTelefone: payload.clienteTelefone,
      endereco: payload.endereco,
      deliverySlot: payload.deliverySlot,
      pagamentoTipo: payload.pagamentoTipo,
      couponId: payload.couponId ?? null,
      subtotal: payload.subtotal.toFixed(2),
      desconto: payload.desconto.toFixed(2),
      frete: payload.frete.toFixed(2),
      total: payload.total.toFixed(2),
      status: 'pendente',
      pagamentoStatus: 'aguardando',
    })

    // Retrieve the inserted order id
    const [inserted] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.numero, numero))
      .limit(1)

    const orderId = inserted.id

    // Insert order items
    await db.insert(orderItems).values(
      payload.items.map((item) => ({
        orderId,
        productId: item.productId,
        nomeSnapshot: item.nome,
        precoSnapshot: item.preco.toFixed(2),
        imagemSnapshot: item.imagem ?? null,
        quantidade: item.quantidade.toFixed(3),
        isKg: item.isKg,
        subtotal: (item.preco * item.quantidade).toFixed(2),
      }))
    )

    // Increment coupon usage
    if (payload.couponId) {
      await db
        .update(coupons)
        .set({ usosAtuais: sql`${coupons.usosAtuais} + 1` })
        .where(eq(coupons.id, payload.couponId))
    }

    return { success: true, numero, orderId }
  } catch (err) {
    console.error('[createOrder]', err)
    return { success: false, error: 'Erro ao registrar pedido. Tente novamente.' }
  }
}
