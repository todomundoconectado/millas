import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { isNotNull, eq, sql, and } from 'drizzle-orm'
import { buscarImagemPorEAN } from '@/lib/ean-images'

// GET — estatísticas sem executar nada
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [totalComEan] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(isNotNull(products.ean))

  const [semImagem] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(isNotNull(products.ean), sql`JSON_LENGTH(${products.imagens}) = 0`))

  return NextResponse.json({
    totalComEan: Number(totalComEan.n),
    semImagem: Number(semImagem.n),
    comImagem: Number(totalComEan.n) - Number(semImagem.n),
  })
}

// POST — processa um lote (offset + limite) ou um produto específico (produtoId)
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const limite = Number(body.limite ?? 20)
  const offset = Number(body.offset ?? 0)
  const produtoId = body.produtoId ? Number(body.produtoId) : null

  // Total de produtos com EAN sem imagem
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(isNotNull(products.ean), sql`JSON_LENGTH(${products.imagens}) = 0`))

  const totalNum = Number(total)

  // Buscar o lote (ou produto específico)
  const lote = produtoId
    ? await db
        .select({ id: products.id, ean: products.ean, nome: products.nome, estoque: products.estoque })
        .from(products)
        .where(eq(products.id, produtoId))
        .limit(1)
    : await db
        .select({ id: products.id, ean: products.ean, nome: products.nome, estoque: products.estoque })
        .from(products)
        .where(and(isNotNull(products.ean), sql`JSON_LENGTH(${products.imagens}) = 0`))
        .orderBy(products.id)
        .limit(limite)
        .offset(offset)

  const resultados: { id: number; nome: string; ean: string; ok: boolean; fonte?: string; motivo?: string }[] = []
  let encontradas = 0
  let naoEncontradas = 0

  for (const p of lote) {
    if (!p.ean) {
      resultados.push({ id: p.id, nome: p.nome, ean: '', ok: false, motivo: 'sem EAN' })
      naoEncontradas++
      continue
    }

    try {
      const result = await buscarImagemPorEAN(p.ean, p.id)
      if (result) {
        const qtd = Number(p.estoque)
        const ativo = qtd >= 10
        await db.update(products)
          .set({ imagens: [result.localPath], ativo })
          .where(eq(products.id, p.id))
        resultados.push({ id: p.id, nome: p.nome, ean: p.ean, ok: true, fonte: result.fonte })
        encontradas++
      } else {
        resultados.push({ id: p.id, nome: p.nome, ean: p.ean, ok: false, motivo: 'não encontrado' })
        naoEncontradas++
      }
    } catch (e) {
      resultados.push({ id: p.id, nome: p.nome, ean: p.ean, ok: false, motivo: e instanceof Error ? e.message : 'erro' })
      naoEncontradas++
    }

    // Delay entre requisições para não sobrecarregar APIs externas
    if (!produtoId) await new Promise(r => setTimeout(r, 300))
  }

  const proximo = produtoId ? null : offset + lote.length
  const concluido = produtoId ? true : (proximo ?? 0) >= totalNum

  return NextResponse.json({
    processados: lote.length,
    encontradas,
    naoEncontradas,
    total: totalNum,
    proximo,
    concluido,
    resultados,
  })
}
