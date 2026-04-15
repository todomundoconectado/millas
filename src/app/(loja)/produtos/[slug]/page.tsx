import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getProductBySlug } from '@/lib/db/queries/products'
import { getRecommendations } from '@/lib/db/queries/recommendations'
import ProductCard from '@/components/loja/ProductCard'
import AddToCartPanel from '@/components/loja/AddToCartPanel'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const produto = await getProductBySlug(slug)
  if (!produto) return {}
  return {
    title: `${produto.nome} — Super Millas`,
    description: produto.descricao?.slice(0, 160) ?? `Compre ${produto.nome} no Super Millas.`,
  }
}

export const dynamic = 'force-dynamic'

export default async function ProdutoDetalhe({ params }: Props) {
  const { slug } = await params

  let produto: Awaited<ReturnType<typeof getProductBySlug>>
  try {
    produto = await getProductBySlug(slug)
  } catch (err) {
    console.error('[PRODUTO] DB error para slug:', slug, err)
    throw err // mostra 500 em vez de 404 quando é erro de banco
  }
  if (!produto) notFound()

  let relacionados: Awaited<ReturnType<typeof getRecommendations>> = []
  try {
    relacionados = await getRecommendations(produto.id, produto.categoriaId)
  } catch {
    // product_affinities table may not exist yet — degrade gracefully
  }
  const imagens = (produto.imagens as string[]) ?? []

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
        <a href="/" className="hover:text-primary transition-colors">Início</a>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <a href="/produtos" className="hover:text-primary transition-colors">Produtos</a>
        {produto.categoriaSlug && (
          <>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <a href={`/produtos?categoria=${produto.categoriaSlug}`} className="hover:text-primary transition-colors">
              {produto.categoriaNome}
            </a>
          </>
        )}
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-on-surface font-semibold truncate max-w-[200px]">{produto.nome}</span>
      </nav>

      {/* Produto principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
        {/* Imagem */}
        <div className="lg:col-span-7">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-container group">
            {imagens[0] ? (
              <Image
                src={imagens[0]}
                alt={produto.nome}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 1024px) 100vw, 58vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-8xl text-outline-variant">image</span>
                <p className="text-on-surface-variant text-sm">Imagem em breve</p>
              </div>
            )}

            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {produto.precoDe && (
                <span className="text-[11px] px-3 py-1 rounded-full bg-error text-on-error font-bold">Oferta</span>
              )}
              {produto.isKg && (
                <span className="text-[11px] px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed font-bold">
                  Vendido por kg
                </span>
              )}
            </div>
          </div>

          {/* Galeria miniaturas */}
          {imagens.length > 1 && (
            <div className="flex gap-3 mt-4">
              {imagens.slice(1).map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-container shrink-0">
                  <Image src={img} alt={`${produto.nome} ${i + 2}`} fill className="object-cover" sizes="80px" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel de compra */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <div className="mb-4">
            {produto.categoriaNome && (
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                {produto.categoriaNome}
              </p>
            )}
            <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface leading-tight">
              {produto.nome}
            </h1>
          </div>

          <AddToCartPanel
            id={produto.id}
            nome={produto.nome}
            slug={produto.slug}
            preco={produto.preco}
            precoDe={produto.precoDe ?? null}
            imagens={imagens}
            isKg={produto.isKg}
          />
        </div>
      </div>

      {/* Descrição */}
      {produto.descricao && (
        <div className="mt-16 md:mt-24">
          <div className="bg-surface-container-lowest p-8 rounded-xl">
            <h2 className="text-xl font-headline font-extrabold mb-4">Sobre o produto</h2>
            <p className="text-on-surface-variant leading-relaxed whitespace-pre-line">{produto.descricao}</p>
          </div>
        </div>
      )}

      {/* Produtos relacionados */}
      {relacionados.length > 0 && (
        <section className="mt-16 md:mt-24">
          <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-8">
            Você também pode gostar
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relacionados.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                nome={p.nome}
                slug={p.slug}
                preco={p.preco}
                precoDe={p.precoDe}
                imagens={(p.imagens as string[]) ?? []}
                isKg={p.isKg}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
