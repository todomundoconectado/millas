import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const results: string[] = []

  const steps: Array<{ label: string; query: string }> = [
    {
      label: 'products.ean',
      query: 'ALTER TABLE `products` ADD COLUMN `ean` varchar(50)',
    },
    {
      label: 'products.descricao_ia',
      query: 'ALTER TABLE `products` ADD COLUMN `descricao_ia` boolean NOT NULL DEFAULT false',
    },
  ]

  for (const step of steps) {
    try {
      await db.execute(sql.raw(step.query))
      results.push(`✓ ${step.label} adicionado`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('duplicate column') || msg.includes('1060')) {
        results.push(`— ${step.label} já existe`)
      } else {
        results.push(`✗ ${step.label}: ${msg}`)
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
