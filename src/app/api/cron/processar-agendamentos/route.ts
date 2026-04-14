import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { products, scheduledUpdates } from '@/lib/db/schema'
import { eq, lte, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  // Verificar secret para execução via cron externo
  const authHeader = request.headers.get('Authorization')
  const secret = process.env.WEBHOOK_SECRET

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pending = await db
    .select()
    .from(scheduledUpdates)
    .where(and(
      eq(scheduledUpdates.executado, false),
      lte(scheduledUpdates.executaEm, new Date())
    ))

  let processed = 0
  let errors = 0

  for (const update of pending) {
    try {
      if (!update.productId) continue

      switch (update.campo) {
        case 'preco':
          await db.update(products).set({ preco: update.valorNovo }).where(eq(products.id, update.productId))
          break
        case 'preco_de':
          await db.update(products).set({ precoDe: update.valorNovo || null }).where(eq(products.id, update.productId))
          break
        case 'estoque':
          await db.update(products).set({ estoque: update.valorNovo }).where(eq(products.id, update.productId))
          break
        case 'ativo':
          await db.update(products).set({ ativo: update.valorNovo === 'true' || update.valorNovo === '1' }).where(eq(products.id, update.productId))
          break
      }

      await db.update(scheduledUpdates).set({ executado: true }).where(eq(scheduledUpdates.id, update.id))
      processed++
    } catch {
      errors++
    }
  }

  return NextResponse.json({ ok: true, processed, errors, total: pending.length })
}
