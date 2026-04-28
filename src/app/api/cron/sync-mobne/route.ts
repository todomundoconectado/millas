import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { products, categories, syncState } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { buscarImagemPorEAN } from '@/lib/ean-images'
import { gerarDescricao } from '@/lib/generate-description'
import { auth } from '@/lib/auth'

const MOBNE_URL = process.env.MOBNE_API_URL ?? 'https://apiexternal.mobne.com.br'
const MOBNE_KEY = process.env.MOBNE_API_KEY ?? ''
const EMPRESA_ID = Number(process.env.MOBNE_EMPRESA_ID ?? '0')
const PAGE_SIZE = 100

// Categorias internas do Mobne que não devem ir ao e-commerce
const EXCLUDED_ROOT_IDS = new Set([1, 144042]) // À CLASSIFICAR, ALMOXARIFADO

function err2str(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

async function getPointer(key: string): Promise<number> {
  const [row] = await db
    .select({ value: syncState.value })
    .from(syncState)
    .where(eq(syncState.key, key))
    .limit(1)
  return row?.value ?? 0
}

async function setPointer(key: string, value: number) {
  await db
    .insert(syncState)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } })
}

async function mobneGet(path: string): Promise<Response> {
  return fetch(`${MOBNE_URL}${path}`, {
    headers: {
      Authorization: `ApiKey ${MOBNE_KEY}`,
      Accept: 'application/json',
    },
  })
}

function toSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function resolveSlug(base: string): Promise<string> {
  let slug = base
  let i = 1
  while (true) {
    const [exists] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)
    if (!exists) return slug
    slug = `${base}-${i++}`
  }
}

// ── Pré-etapa: categorias ─────────────────────────────────────────────────────

interface MobneCategoria {
  CategoriaId: number
  Categoria: string
  AceitaProduto: string
  CategoriaPai?: number
  NivelHierarquia: number
}

async function syncCategorias(): Promise<{
  excludedIds: Set<number>
  mobneToLocalId: Map<number, number>
}> {
  const allCats: MobneCategoria[] = []
  let page = 1

  while (true) {
    const res = await mobneGet(`/api/v1/Produto/consulta-cadastro-categoria?PageSize=${PAGE_SIZE}&PageNumber=${page}`)
    if (!res.ok) break
    const body = await res.json()
    if (!body.Success) break
    const items: MobneCategoria[] = body.Data?.Items ?? []
    allCats.push(...items)
    if (items.length < PAGE_SIZE) break
    page++
  }

  // Construir mapa pai → filhos para BFS
  const childrenOf = new Map<number, number[]>()
  for (const c of allCats) {
    if (c.CategoriaPai) {
      const arr = childrenOf.get(c.CategoriaPai) ?? []
      arr.push(c.CategoriaId)
      childrenOf.set(c.CategoriaPai, arr)
    }
  }

  // BFS a partir das raízes excluídas para obter todos os descendentes
  const excludedIds = new Set<number>(EXCLUDED_ROOT_IDS)
  const queue = [...EXCLUDED_ROOT_IDS]
  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const child of (childrenOf.get(cur) ?? [])) {
      if (!excludedIds.has(child)) {
        excludedIds.add(child)
        queue.push(child)
      }
    }
  }

  // Pass 1 — upsert TODAS as categorias não excluídas (container + folha), sem parentId ainda
  const mobneToLocalId = new Map<number, number>()

  for (const c of allCats) {
    if (excludedIds.has(c.CategoriaId)) continue

    const mobneIdStr = String(c.CategoriaId)
    const slug = toSlug(c.Categoria) || `cat-${c.CategoriaId}`

    try {
      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.mobneId, mobneIdStr))
        .limit(1)

      if (existing) {
        mobneToLocalId.set(c.CategoriaId, existing.id)
        await db.update(categories).set({ nome: c.Categoria }).where(eq(categories.id, existing.id))
      } else {
        let finalSlug = slug
        let attempt = 1
        while (true) {
          const [slugExists] = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.slug, finalSlug))
            .limit(1)
          if (!slugExists) break
          finalSlug = `${slug}-${attempt++}`
        }

        const [ins] = await db
          .insert(categories)
          .values({ nome: c.Categoria, slug: finalSlug, mobneId: mobneIdStr, ativo: true })
          .$returningId()
        if (ins?.id) mobneToLocalId.set(c.CategoriaId, ins.id)
      }
    } catch { /* categoria já existe ou erro pontual */ }
  }

  // Pass 2 — atualizar parentId para refletir hierarquia do Mobne
  for (const c of allCats) {
    if (excludedIds.has(c.CategoriaId)) continue
    if (!c.CategoriaPai || excludedIds.has(c.CategoriaPai)) continue

    const localId = mobneToLocalId.get(c.CategoriaId)
    const localParentId = mobneToLocalId.get(c.CategoriaPai)
    if (!localId || !localParentId) continue

    try {
      await db.update(categories).set({ parentId: localParentId }).where(eq(categories.id, localId))
    } catch { /* ignorar */ }
  }

  return { excludedIds, mobneToLocalId }
}

// ── Rota principal ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET
  const cronOk = secret && authHeader === `Bearer ${secret}`
  const session = cronOk ? null : await auth()
  if (!cronOk && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!MOBNE_KEY) {
    return NextResponse.json({ error: 'MOBNE_API_KEY não configurado' }, { status: 503 })
  }
  if (!EMPRESA_ID) {
    return NextResponse.json({ error: 'MOBNE_EMPRESA_ID não configurado' }, { status: 503 })
  }

  const stats = {
    newProducts: 0,
    updatedProducts: 0,
    updatedPrices: 0,
    updatedStock: 0,
    imagesFound: 0,
    descriptionsGenerated: 0,
    categoriesSynced: 0,
    errors: [] as string[],
  }

  // ── PRÉ-ETAPA: Sincronizar categorias ────────────────────────────────────────
  let excludedIds = new Set<number>(EXCLUDED_ROOT_IDS)
  let mobneToLocalId = new Map<number, number>()

  try {
    const result = await syncCategorias()
    excludedIds = result.excludedIds
    mobneToLocalId = result.mobneToLocalId
    stats.categoriesSynced = mobneToLocalId.size
  } catch (e) {
    stats.errors.push(`Categorias: ${err2str(e)}`)
  }

  // ── ETAPA 1: Produtos novos/alterados ────────────────────────────────────────
  try {
    let pointer = await getPointer('produto_nro_base')
    let maxPointer = pointer
    let page = 1
    let hasMore = true

    while (hasMore) {
      const res = await mobneGet(
        `/api/v1/Produto/consulta-cadastro-produto?Filter.EmpresaId=${EMPRESA_ID}&Filter.NroBaseExportacao=${pointer}&PageNumber=${page}&PageSize=${PAGE_SIZE}`,
      )
      if (!res.ok) {
        stats.errors.push(`Produtos: HTTP ${res.status}`)
        break
      }
      const body = await res.json()
      if (!body.Success) {
        stats.errors.push(`Produtos: ${JSON.stringify(body.Errors)}`)
        break
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = body.Data?.Items ?? []
      hasMore = items.length === PAGE_SIZE

      for (const p of items) {
        try {
          // Pular categorias internas
          if (p.CategoriaId && excludedIds.has(Number(p.CategoriaId))) continue

          const mobneIdStr = String(p.ProdutoId)

          if ((p.NroBaseExportacao ?? 0) > maxPointer) {
            maxPointer = p.NroBaseExportacao
          }

          // EAN principal
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eanEntry = (p.ProdCodAcesso ?? []).find((c: any) =>
            (c.TipoCodigo === 'E' || c.TipoCodigo === 'A') && c.Status === 'A' && c.IndPrincipal === 'S',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) ?? (p.ProdCodAcesso ?? []).find((c: any) => c.TipoCodigo === 'E' || c.TipoCodigo === 'A')
          const ean: string | undefined = eanEntry?.CodAcesso

          const isKg = p.PermiteQtdDecimal === 'S'
          const nome: string = p.Descricao ?? p.DescricaoReduzida ?? `Produto ${mobneIdStr}`
          const categoriaId = p.CategoriaId ? (mobneToLocalId.get(Number(p.CategoriaId)) ?? null) : null

          // Preço unitário
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const empresaData = (p.ProdEmpresa ?? []).find((e: any) => e.EmpresaId === EMPRESA_ID)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const precoEntry = (empresaData?.Preco ?? []).find((pr: any) => pr.QtdEmbalagem === 1)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ?? (empresaData?.Preco ?? [])[0] as any
          const preco: string = precoEntry
            ? String(precoEntry.PrecoUnitario ?? precoEntry.Preco ?? '0')
            : '0'

          const [existing] = await db
            .select({ id: products.id, imagens: products.imagens })
            .from(products)
            .where(eq(products.mobneId, mobneIdStr))
            .limit(1)

          if (existing) {
            await db.update(products)
              .set({ nome, ean: ean ?? undefined, isKg, categoriaId })
              .where(eq(products.id, existing.id))
            stats.updatedProducts++
          } else {
            // Criar produto novo
            const slug = await resolveSlug(toSlug(nome))
            const [inserted] = await db.insert(products)
              .values({
                nome,
                slug,
                preco,
                ean: ean ?? undefined,
                isKg,
                mobneId: mobneIdStr,
                categoriaId,
                ativo: false,
                estoque: '0',
                imagens: [],
              })
              .$returningId()
            stats.newProducts++

            if (inserted?.id) {
              // Buscar imagem por EAN
              let imagemPath: string | null = null
              if (ean) {
                try {
                  const imgResult = await buscarImagemPorEAN(ean, inserted.id)
                  if (imgResult) {
                    imagemPath = imgResult.localPath
                    await db.update(products)
                      .set({ imagens: [imagemPath] })
                      .where(eq(products.id, inserted.id))
                    stats.imagesFound++
                  }
                } catch (e) {
                  stats.errors.push(`EAN img ${ean}: ${err2str(e)}`)
                }
              }

              // Gerar descrição via IA
              try {
                const categoriaLocal = categoriaId
                  ? await db.select({ nome: categories.nome }).from(categories).where(eq(categories.id, categoriaId)).limit(1).then(r => r[0]?.nome)
                  : undefined
                const descricao = await gerarDescricao({ nome, categoria: categoriaLocal, ean })
                if (descricao) {
                  await db.update(products)
                    .set({ descricao, descricaoIa: true })
                    .where(eq(products.id, inserted.id))
                  stats.descriptionsGenerated++
                }
              } catch (e) {
                stats.errors.push(`Descrição ${mobneIdStr}: ${err2str(e)}`)
              }
            }
          }
        } catch (e) {
          stats.errors.push(`Produto ${p.ProdutoId}: ${err2str(e)}`)
        }
      }

      page++
    }

    if (maxPointer > pointer) {
      await setPointer('produto_nro_base', maxPointer)
    }
  } catch (e) {
    stats.errors.push(`Etapa produtos: ${err2str(e)}`)
  }

  // ── ETAPA 2: Preços alterados ─────────────────────────────────────────────────
  try {
    let pointer = await getPointer('preco_nro_base')
    let maxPointer = pointer
    let page = 1
    let hasMore = true

    while (hasMore) {
      const res = await mobneGet(
        `/api/v1/Produto/consulta-preco?Filter.EmpresaId=${EMPRESA_ID}&Filter.NroBaseExportacao=${pointer}&PageNumber=${page}&PageSize=${PAGE_SIZE}`,
      )
      if (!res.ok) { stats.errors.push(`Preços: HTTP ${res.status}`); break }
      const body = await res.json()
      if (!body.Success) { stats.errors.push(`Preços: ${JSON.stringify(body.Errors)}`); break }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = body.Data?.Items ?? []
      hasMore = items.length === PAGE_SIZE

      for (const pr of items) {
        try {
          if ((pr.NroBaseExportacao ?? 0) > maxPointer) maxPointer = pr.NroBaseExportacao
          if (pr.QtdEmbalagem !== 1) continue

          const [prod] = await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.mobneId, String(pr.ProdutoId)))
            .limit(1)
          if (!prod) continue

          await db.update(products).set({ preco: String(pr.PrecoUnitario ?? pr.Preco ?? '0') }).where(eq(products.id, prod.id))
          stats.updatedPrices++
        } catch (e) {
          stats.errors.push(`Preço ${pr.ProdutoId}: ${err2str(e)}`)
        }
      }
      page++
    }

    if (maxPointer > pointer) await setPointer('preco_nro_base', maxPointer)
  } catch (e) {
    stats.errors.push(`Etapa preços: ${err2str(e)}`)
  }

  // ── ETAPA 3: Estoque alterado ─────────────────────────────────────────────────
  try {
    let pointer = await getPointer('estoque_nro_base')
    let maxPointer = pointer
    let page = 1
    let hasMore = true

    while (hasMore) {
      const res = await mobneGet(
        `/api/v1/Produto/consulta-estoque-produto?Filter.EmpresaId=${EMPRESA_ID}&Filter.NroBaseExportacao=${pointer}&PageNumber=${page}&PageSize=${PAGE_SIZE}`,
      )
      if (!res.ok) { stats.errors.push(`Estoque: HTTP ${res.status}`); break }
      const body = await res.json()
      if (!body.Success) { stats.errors.push(`Estoque: ${JSON.stringify(body.Errors)}`); break }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = body.Data?.Items ?? []
      hasMore = items.length === PAGE_SIZE

      for (const est of items) {
        try {
          if ((est.NroBaseExportacao ?? 0) > maxPointer) maxPointer = est.NroBaseExportacao

          const [prod] = await db
            .select({ id: products.id, imagens: products.imagens })
            .from(products)
            .where(eq(products.mobneId, String(est.ProdutoId)))
            .limit(1)
          if (!prod) continue

          const qtd: number = est.QtdeEstoque ?? 0
          // Ativo somente se estoque >= 10 E tem imagem
          const temImagem = (prod.imagens?.length ?? 0) > 0
          const ativo = qtd >= 10 && temImagem
          await db.update(products)
            .set({ estoque: String(qtd), ativo })
            .where(eq(products.id, prod.id))
          stats.updatedStock++
        } catch (e) {
          stats.errors.push(`Estoque ${est.ProdutoId}: ${err2str(e)}`)
        }
      }
      page++
    }

    if (maxPointer > pointer) await setPointer('estoque_nro_base', maxPointer)
  } catch (e) {
    stats.errors.push(`Etapa estoque: ${err2str(e)}`)
  }

  return NextResponse.json({ ok: true, ...stats })
}
