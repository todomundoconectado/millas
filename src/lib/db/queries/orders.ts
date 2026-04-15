import { db } from '@/lib/db'
import { orders, orderItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getOrderByNumero(numero: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.numero, numero))
    .limit(1)
  if (!order) return null

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))

  return { ...order, items }
}

export async function getOrderById(id: number) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)
  if (!order) return null

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))

  return { ...order, items }
}
