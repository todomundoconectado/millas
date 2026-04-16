import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const permanente = '/home/u500207944/uploads-permanentes/produtos'
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const linkPath = path.join(uploadsDir, 'produtos')

  let symlinkStatus = 'missing'
  let imageDirsCount = 0
  let sampleFiles: string[] = []
  let permanentPathExists = false

  try {
    permanentPathExists = fs.existsSync(permanente)

    if (fs.existsSync(linkPath)) {
      const stat = fs.lstatSync(linkPath)
      if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(linkPath)
        symlinkStatus = target === permanente ? 'ok' : `wrong_target (aponta para: ${target})`
      } else {
        symlinkStatus = 'real_dir_not_symlink'
      }
    }

    if (permanentPathExists) {
      const dirs = fs.readdirSync(permanente)
      imageDirsCount = dirs.length
      for (const dir of dirs.slice(0, 5)) {
        try {
          const files = fs.readdirSync(path.join(permanente, dir))
          if (files.length > 0) {
            sampleFiles.push(`/uploads/produtos/${dir}/${files[0]}`)
          }
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    symlinkStatus = `error: ${String(err)}`
  }

  let productsWithImages = 0
  let productsWithoutImages = 0
  let totalProducts = 0

  try {
    const [r1] = await db.select({ count: sql<number>`COUNT(*)` }).from(products)
      .where(sql`JSON_LENGTH(imagens) > 0`)
    const [r2] = await db.select({ count: sql<number>`COUNT(*)` }).from(products)
      .where(sql`JSON_LENGTH(imagens) = 0 OR imagens IS NULL OR imagens = '[]'`)
    const [r3] = await db.select({ count: sql<number>`COUNT(*)` }).from(products)

    productsWithImages = Number(r1.count)
    productsWithoutImages = Number(r2.count)
    totalProducts = Number(r3.count)
  } catch (err) {
    console.error('[diagnostico] DB error:', err)
  }

  // ── Diagnóstico do .next/static/chunks ──────────────────────────────────
  const chunksDir = path.join(process.cwd(), '.next', 'static', 'chunks')
  let cssChunks: string[] = []
  let chunksExists = false
  let cwd = process.cwd()
  try {
    chunksExists = fs.existsSync(chunksDir)
    if (chunksExists) {
      cssChunks = fs.readdirSync(chunksDir).filter(f => f.endsWith('.css'))
    }
  } catch { /* skip */ }

  return NextResponse.json({
    cwd,
    symlink: symlinkStatus,
    permanent_path_exists: permanentPathExists,
    permanent_path: permanente,
    image_dirs_count: imageDirsCount,
    sample_files: sampleFiles,
    next_static: {
      chunks_dir: chunksDir,
      chunks_dir_exists: chunksExists,
      css_chunks: cssChunks,
    },
    db: {
      total_products: totalProducts,
      products_with_images: productsWithImages,
      products_without_images: productsWithoutImages,
    },
  })
}
