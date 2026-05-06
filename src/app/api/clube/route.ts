import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { nome, whatsapp, origem } = await req.json()

  const sheetsUrl = process.env.GOOGLE_SHEETS_CLUBE_URL
  if (sheetsUrl) {
    const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    try {
      await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: ts, nome, whatsapp, origem }),
      })
    } catch {}
  }

  return NextResponse.json({ ok: true })
}
