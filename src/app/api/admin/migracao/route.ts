import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET
  const cronOk = secret && authHeader === `Bearer ${secret}`
  const session = cronOk ? null : await auth()
  if (!cronOk && !session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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
    {
      label: 'products.mobne_id',
      query: 'ALTER TABLE `products` ADD COLUMN `mobne_id` varchar(50) UNIQUE',
    },
    {
      label: 'sync_state (tabela)',
      query: 'CREATE TABLE IF NOT EXISTS `sync_state` (`key` varchar(50) NOT NULL PRIMARY KEY, `value` bigint NOT NULL DEFAULT 0, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)',
    },
    {
      label: 'categories.mobne_id',
      query: 'ALTER TABLE `categories` ADD COLUMN `mobne_id` varchar(50)',
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
