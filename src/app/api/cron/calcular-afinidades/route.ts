import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orderItems, productAffinities } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Busca todos os itens de pedido agrupados por orderId
  const items = await db
    .select({
      orderId: orderItems.orderId,
      productId: orderItems.productId,
    })
    .from(orderItems)
    .where(sql`${orderItems.productId} IS NOT NULL`)

  // Agrupa por pedido
  const byOrder = new Map<number, number[]>()
  for (const item of items) {
    if (!item.productId) continue
    if (!byOrder.has(item.orderId)) byOrder.set(item.orderId, [])
    byOrder.get(item.orderId)!.push(item.productId)
  }

  // Conta co-ocorrências
  const coOccurrences = new Map<string, number>()
  const productFrequency = new Map<number, number>()

  for (const [, productIds] of byOrder) {
    const unique = [...new Set(productIds)]
    for (const pid of unique) {
      productFrequency.set(pid, (productFrequency.get(pid) ?? 0) + 1)
    }
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key1 = `${unique[i]}-${unique[j]}`
        const key2 = `${unique[j]}-${unique[i]}`
        coOccurrences.set(key1, (coOccurrences.get(key1) ?? 0) + 1)
        coOccurrences.set(key2, (coOccurrences.get(key2) ?? 0) + 1)
      }
    }
  }

  if (coOccurrences.size === 0) {
    return NextResponse.json({ ok: true, pairs: 0 })
  }

  // Normaliza score: coOccurrence / sqrt(freq_a * freq_b)  (Jaccard-like)
  const upserts: { productId: number; affineProductId: number; score: string }[] = []
  for (const [key, count] of coOccurrences) {
    const [a, b] = key.split('-').map(Number)
    const freqA = productFrequency.get(a) ?? 1
    const freqB = productFrequency.get(b) ?? 1
    const score = count / Math.sqrt(freqA * freqB)
    upserts.push({ productId: a, affineProductId: b, score: score.toFixed(4) })
  }

  // Upsert em lotes de 200
  const BATCH = 200
  for (let i = 0; i < upserts.length; i += BATCH) {
    const batch = upserts.slice(i, i + BATCH)
    await db
      .insert(productAffinities)
      .values(batch)
      .onDuplicateKeyUpdate({ set: { score: sql`VALUES(score)` } })
  }

  return NextResponse.json({ ok: true, pairs: upserts.length })
}
