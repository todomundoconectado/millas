import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { syncState, products } from '@/lib/db/schema'
import { isNotNull, eq, sql } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const rows = await db.select().from(syncState)
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json([])
  }
}

// Verifica e corrige o status ativo de todos os produtos Mobne
// Regra: ativo = estoque >= 10 AND imagens.length > 0
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const allMobne = await db
    .select({ id: products.id, estoque: products.estoque, imagens: products.imagens, ativo: products.ativo })
    .from(products)
    .where(isNotNull(products.mobneId))

  let fixed = 0
  let ok = 0
  const details: { id: number; antes: boolean; depois: boolean; motivo: string }[] = []

  for (const p of allMobne) {
    const qtd = Number(p.estoque)
    const temImagem = (p.imagens as string[]).length > 0
    const deveSerAtivo = qtd >= 10 && temImagem
    if (deveSerAtivo !== p.ativo) {
      await db.update(products).set({ ativo: deveSerAtivo }).where(eq(products.id, p.id))
      const motivo = !temImagem ? 'sem imagem' : qtd < 10 ? `estoque ${qtd}` : 'ok'
      details.push({ id: p.id, antes: p.ativo, depois: deveSerAtivo, motivo })
      fixed++
    } else {
      ok++
    }
  }

  return NextResponse.json({ fixed, ok, total: allMobne.length, details: details.slice(0, 50) })
}
