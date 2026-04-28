import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq, isNotNull, isNull, sql, and } from 'drizzle-orm'

const MOBNE_URL = process.env.MOBNE_API_URL ?? 'https://apiexternal.mobne.com.br'
const MOBNE_KEY = process.env.MOBNE_API_KEY ?? ''
const EMPRESA_ID = Number(process.env.MOBNE_EMPRESA_ID ?? '0')

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // ── Consulta local ───────────────────────────────────────────────────────
  const [totalMobne] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(isNotNull(products.mobneId))

  const [totalAtivos] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(isNotNull(products.mobneId), eq(products.ativo, true)))

  const [inativosEstoque] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(
      isNotNull(products.mobneId),
      eq(products.ativo, false),
      sql`CAST(${products.estoque} AS DECIMAL) < 10`,
    ))

  const [inativosSemImagem] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(
      isNotNull(products.mobneId),
      eq(products.ativo, false),
      sql`CAST(${products.estoque} AS DECIMAL) >= 10`,
      sql`JSON_LENGTH(${products.imagens}) = 0`,
    ))

  const [manuais] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(products)
    .where(isNull(products.mobneId))

  // ── Consulta Mobne (apenas 1ª página para pegar total) ───────────────────
  let mobneTotal: number | null = null
  let mobneTotalPages: number | null = null
  let mobneError: string | null = null

  try {
    const res = await fetch(
      `${MOBNE_URL}/api/v1/Produto/consulta-cadastro-produto?Filter.EmpresaId=${EMPRESA_ID}&Filter.NroBaseExportacao=0&PageNumber=1&PageSize=1`,
      {
        headers: {
          Authorization: `ApiKey ${MOBNE_KEY}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    )

    if (res.ok) {
      const body = await res.json()
      if (body.Success) {
        // Mobne retorna TotalItems ou TotalCount dependendo da versão
        const total = body.Data?.TotalItems ?? body.Data?.TotalCount ?? body.Data?.Total ?? null
        mobneTotal = total !== null ? Number(total) : null
        if (mobneTotal !== null) {
          mobneTotalPages = Math.ceil(mobneTotal / 100)
        }
      } else {
        mobneError = JSON.stringify(body.Errors ?? body.Message ?? 'Erro desconhecido')
      }
    } else {
      mobneError = `HTTP ${res.status}`
    }
  } catch (e) {
    mobneError = e instanceof Error ? e.message : String(e)
  }

  const localTotal = Number(totalMobne.n)
  const diff = mobneTotal !== null ? mobneTotal - localTotal : null

  return NextResponse.json({
    local: {
      totalMobne: localTotal,
      ativos: Number(totalAtivos.n),
      inativosEstoque: Number(inativosEstoque.n),
      inativosSemImagem: Number(inativosSemImagem.n),
      manuais: Number(manuais.n),
    },
    mobne: {
      total: mobneTotal,
      pages: mobneTotalPages,
      error: mobneError,
    },
    diff,
    note: mobneTotal !== null && diff !== null && diff > 0
      ? `${diff} produtos do Mobne ainda não estão no site (podem ser de categorias internas excluídas, ou ainda não sincronizados)`
      : null,
  })
}
