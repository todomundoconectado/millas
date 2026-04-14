import Link from 'next/link'
import ProductCard from '@/components/loja/ProductCard'
import { listOffers } from '@/lib/db/queries/products'
import { listCategories } from '@/lib/db/queries/categories'

const TRUST_ITEMS = [
  { icon: 'local_shipping', title: 'Entrega rápida', desc: 'Produtos frescos na sua porta' },
  { icon: 'verified', title: 'Qualidade garantida', desc: 'Selecionados com cuidado' },
  { icon: 'inventory_2', title: '5 mil+ produtos', desc: 'Tudo que você precisa, num lugar só' },
]

function categoryEmoji(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('bebida'))           return '🥤'
  if (n.includes('perecív') || n.includes('frios') || n.includes('laticín')) return '🧀'
  if (n.includes('carne') || n.includes('aves') || n.includes('peixe'))      return '🥩'
  if (n.includes('hortifruti') || n.includes('fruta') || n.includes('verdur')) return '🥦'
  if (n.includes('limpeza'))          return '🧹'
  if (n.includes('higiene') || n.includes('perfum')) return '🧴'
  if (n.includes('padaria') || n.includes('biscoito') || n.includes('seca doce')) return '🍞'
  if (n.includes('seca salgada') || n.includes('salgad')) return '🥫'
  if (n.includes('bazar'))            return '🏪'
  if (n.includes('congelado') || n.includes('gelado')) return '🧊'
  if (n.includes('pet') || n.includes('animal')) return '🐾'
  return '📦'
}

const CAT_COLORS = [
  'bg-green-100', 'bg-red-100', 'bg-yellow-100',
  'bg-blue-100', 'bg-purple-100', 'bg-amber-100',
  'bg-pink-100', 'bg-teal-100',
]

export default async function HomePage() {
  const [ofertas, categorias] = await Promise.all([
    listOffers(8),
    listCategories(),
  ])

  const topCategorias = categorias.slice(0, 8)

  return (
    <div className="flex flex-col gap-0">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-primary min-h-[480px] md:min-h-[560px] flex items-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary-fixed blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary-fixed blur-3xl" />
        </div>

        <div className="relative max-w-screen-xl mx-auto px-4 md:px-8 py-16 md:py-24 w-full">
          <div className="max-w-2xl">
            <p className="text-primary-fixed font-label font-semibold text-sm uppercase tracking-widest mb-4">
              Supermercado Online
            </p>
            <h1 className="text-4xl md:text-6xl font-headline font-extrabold text-on-primary leading-tight mb-6">
              Tudo que você precisa,{' '}
              <span className="text-primary-fixed">na palma da mão</span>
            </h1>
            <p className="text-on-primary/80 text-lg mb-8 max-w-md">
              Mais de 5 mil produtos com entrega rápida diretamente na sua porta.
              Frutas frescas, carnes selecionadas e muito mais.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/produtos"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-on-primary-fixed/20"
              >
                <span className="material-symbols-outlined text-[20px]">storefront</span>
                Ver todos os produtos
              </Link>
              {topCategorias[0] && (
                <Link
                  href={`/produtos?categoria=${topCategorias[0].slug}`}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-on-primary/10 text-on-primary font-bold text-base hover:bg-on-primary/20 transition-colors border border-on-primary/20"
                >
                  {topCategorias[0].nome}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals ── */}
      <section className="bg-surface-container-low py-8">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TRUST_ITEMS.map((item) => (
              <div key={item.icon} className="flex items-center gap-4 p-5 bg-surface-container-lowest rounded-xl">
                <span className="material-symbols-outlined filled text-3xl text-primary shrink-0">{item.icon}</span>
                <div>
                  <p className="font-headline font-bold text-on-surface">{item.title}</p>
                  <p className="text-sm text-on-surface-variant">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categorias ── */}
      {topCategorias.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Departamentos</p>
                <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface">
                  Corredores do mercado
                </h2>
              </div>
              <Link href="/produtos" className="hidden sm:flex items-center gap-1 text-primary font-bold text-sm hover:opacity-70 transition-opacity">
                Ver todos
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {topCategorias.map((cat, i) => (
                <Link
                  key={cat.slug}
                  href={`/produtos?categoria=${cat.slug}`}
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl ${CAT_COLORS[i % CAT_COLORS.length]} hover:shadow-md transition-shadow group`}
                >
                  <span className="text-3xl">{categoryEmoji(cat.nome)}</span>
                  <span className="font-headline font-bold text-xs text-on-surface text-center leading-snug">
                    {cat.nome}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Ofertas da semana ── */}
      {ofertas.length > 0 && (
        <section className="py-16 md:py-24 bg-surface-container-low">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Promoções</p>
                <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface">
                  Ofertas da semana
                </h2>
              </div>
              <Link href="/produtos?oferta=true" className="hidden sm:flex items-center gap-1 text-primary font-bold text-sm hover:opacity-70 transition-opacity">
                Ver todas
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {ofertas.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  nome={p.nome}
                  slug={p.slug}
                  preco={p.preco}
                  precoDe={p.precoDe}
                  imagens={(p.imagens as string[]) ?? []}
                  isKg={p.isKg}
                  badge="Oferta"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Search Hub ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface mb-4">
            Não achou o que procura?
          </h2>
          <p className="text-on-surface-variant text-lg mb-10 max-w-md mx-auto">
            Use a busca para encontrar exatamente o que precisa.
          </p>
          <form action="/produtos" method="get" className="max-w-xl mx-auto relative">
            <input
              type="search"
              name="q"
              placeholder="Buscar produtos, marcas, categorias..."
              className="w-full bg-surface-container-highest rounded-full py-5 pl-7 pr-36 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-base shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary-gradient text-on-primary px-6 py-3 rounded-full font-bold text-sm"
            >
              Buscar
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
