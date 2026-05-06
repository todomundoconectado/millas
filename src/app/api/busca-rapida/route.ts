import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq, and, like, sql } from 'drizzle-orm'
import { parseImagens } from '@/lib/db/queries/products'

export const revalidate = 60

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 3) return NextResponse.json({ produtos: [] })

  const rows = await db
    .select({
      id: products.id,
      nome: products.nome,
      slug: products.slug,
      preco: products.preco,
      imagens: products.imagens,
    })
    .from(products)
    .where(
      and(
        eq(products.ativo, true),
        like(products.nome, `%${q}%`),
        sql`JSON_LENGTH(${products.imagens}) > 0`
      )
    )
    .limit(6)

  return NextResponse.json({
    produtos: rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      slug: r.slug,
      preco: r.preco,
      imagem: parseImagens(r.imagens)[0] ?? null,
    })),
  })
}
