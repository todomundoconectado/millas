import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  const info: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    node: process.version,
    env: {
      DB_HOST: process.env.DB_HOST ?? '(not set)',
      DB_PORT: process.env.DB_PORT ?? '(not set)',
      DB_USER: process.env.DB_USER ? '(set)' : '(not set)',
      DB_NAME: process.env.DB_NAME ?? '(not set)',
      AUTH_SECRET: process.env.AUTH_SECRET ? '(set)' : '(not set)',
      NODE_ENV: process.env.NODE_ENV,
    },
  }

  try {
    const result = await db.execute(sql`SELECT 1 AS ok`)
    info.db = 'ok'
    info.dbResult = result
  } catch (err) {
    info.db = 'error'
    info.dbError = String(err)
  }

  return NextResponse.json(info)
}
