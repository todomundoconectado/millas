import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export interface EanImageResult {
  localPath: string
  fonte: 'gs1' | 'cosmos' | 'openfoodfacts'
}

// Tenta baixar uma imagem de URL e salvar como WebP
async function downloadAndSave(
  imageUrl: string,
  productId: number,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    const { default: sharp } = await import('sharp')
    const webp = await sharp(buffer).webp({ quality: 85 }).toBuffer()

    const filename = `ean-${Date.now()}.webp`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'produtos', String(productId))
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), webp)

    return `/uploads/produtos/${productId}/${filename}`
  } catch {
    return null
  }
}

// GS1 Brasil — imagens oficiais (requer GS1_API_KEY)
async function tryGs1(ean: string, productId: number): Promise<string | null> {
  const key = process.env.GS1_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://apicnp.gs1br.org/api/v1/produto/${ean}`,
      { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } },
    )
    if (!res.ok) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    const url: string | undefined = data?.UrlFoto ?? data?.urlFoto ?? data?.data?.UrlFoto
    if (!url) return null
    return downloadAndSave(url, productId)
  } catch {
    return null
  }
}

// Cosmos Bluesoft — boa cobertura Brasil (requer COSMOS_API_KEY)
async function tryCosmos(ean: string, productId: number): Promise<string | null> {
  const key = process.env.COSMOS_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.cosmos.bluesoft.com.br/gtins/${ean}`,
      { headers: { 'X-Cosmos-Token': key, Accept: 'application/json' } },
    )
    if (!res.ok) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    const url: string | undefined = data?.thumbnail_url ?? data?.image_url
    if (!url) return null
    return downloadAndSave(url, productId)
  } catch {
    return null
  }
}

// Open Food Facts — gratuito, colaborativo (sem key)
// Nota: cobertura focada em produtos europeus/americanos; produtos brasileiros (789xxx) têm baixa cobertura
async function tryOpenFoodFacts(ean: string, productId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=image_front_url,image_url`,
      { headers: { Accept: 'application/json', 'User-Agent': 'SuperMillas/1.0 (contato@supermillas.com.br)' } },
    )
    if (!res.ok) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    if (data?.status !== 1) return null
    const url: string | undefined = data?.product?.image_front_url ?? data?.product?.image_url
    if (!url) return null
    return downloadAndSave(url, productId)
  } catch {
    return null
  }
}

// Função principal — tenta em cascata, retorna resultado ou null
export async function buscarImagemPorEAN(
  ean: string,
  productId: number,
): Promise<EanImageResult | null> {
  const gs1 = await tryGs1(ean, productId)
  if (gs1) return { localPath: gs1, fonte: 'gs1' }

  const cosmos = await tryCosmos(ean, productId)
  if (cosmos) return { localPath: cosmos, fonte: 'cosmos' }

  const off = await tryOpenFoodFacts(ean, productId)
  if (off) return { localPath: off, fonte: 'openfoodfacts' }

  return null
}
