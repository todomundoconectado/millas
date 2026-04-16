import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  const chunksDir = path.join(process.cwd(), '.next', 'static', 'chunks')
  let cssChunks: string[] = []
  let chunksExists = false
  const cwd = process.cwd()

  try {
    chunksExists = fs.existsSync(chunksDir)
    if (chunksExists) {
      cssChunks = fs.readdirSync(chunksDir).filter(f => f.endsWith('.css'))
    }
  } catch { /* skip */ }

  return NextResponse.json({ cwd, chunks_dir_exists: chunksExists, css_chunks: cssChunks })
}
