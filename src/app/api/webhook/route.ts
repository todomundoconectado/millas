import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { products, scheduledUpdates, scheduledFields } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface WebhookPayload {
  tipo: 'preco' | 'preco_de' | 'estoque' | 'ativo'
  sku: string
  valor: string
  executa_em?: string // ISO 8601
}

export async function POST(request: NextRequest) {
  // Autenticação via Bearer token
  const authHeader = request.headers.get('Authorization')
  const secret = process.env.WEBHOOK_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { tipo, sku, valor, executa_em } = payload

  if (!tipo || !sku || valor === undefined) {
    return NextResponse.json({ error: 'Missing required fields: tipo, sku, valor' }, { status: 400 })
  }

  if (!(scheduledFields as readonly string[]).includes(tipo)) {
    return NextResponse.json({ error: `Invalid tipo. Must be one of: ${scheduledFields.join(', ')}` }, { status: 400 })
  }

  // Buscar produto pelo SKU
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, sku))
    .limit(1)

  if (!product) {
    return NextResponse.json({ error: `Product with SKU "${sku}" not found` }, { status: 404 })
  }

  const executaEm = executa_em ? new Date(executa_em) : null

  // Se tem data futura, agendar
  if (executaEm && executaEm > new Date()) {
    await db.insert(scheduledUpdates).values({
      productId: product.id,
      campo: tipo,
      valorNovo: String(valor),
      executaEm,
      executado: false,
    })

    return NextResponse.json({ ok: true, agendado: true, executa_em: executaEm.toISOString() })
  }

  // Executar imediatamente
  await applyUpdate(product.id, tipo, String(valor))

  return NextResponse.json({ ok: true, agendado: false })
}

async function applyUpdate(productId: number, campo: string, valor: string) {
  switch (campo) {
    case 'preco':
      await db.update(products).set({ preco: valor }).where(eq(products.id, productId))
      break
    case 'preco_de':
      await db.update(products).set({ precoDe: valor || null }).where(eq(products.id, productId))
      break
    case 'estoque':
      await db.update(products).set({ estoque: valor }).where(eq(products.id, productId))
      break
    case 'ativo':
      await db.update(products).set({ ativo: valor === 'true' || valor === '1' }).where(eq(products.id, productId))
      break
  }
}
