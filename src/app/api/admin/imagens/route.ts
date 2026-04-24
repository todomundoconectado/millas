import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const pasta = (formData.get('pasta') as string | null)?.trim() || 'admin'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.' }, { status: 400 })
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10 MB — sharp vai comprimir
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 10 MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // dynamic import — nunca carregado no bundle do servidor, só quando chamado
    const sharp = (await import('sharp')).default

    // Converte para WebP: redimensiona para máx 1200px, qualidade 82, descarta original
    const webpBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const filename = `${Date.now()}.webp`
    const dir = path.join(process.cwd(), 'public', 'uploads', pasta)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), webpBuffer)

    const url = `/uploads/${pasta}/${filename}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[upload imagem]', err)
    return NextResponse.json({ error: 'Erro ao processar imagem' }, { status: 500 })
  }
}
