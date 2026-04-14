import Link from 'next/link'
import Navbar from '@/components/loja/Navbar'
import Footer from '@/components/loja/Footer'
import ProductCard from '@/components/loja/ProductCard'

const MOCK_CATEGORIES = [
  { slug: 'hortifruti', label: 'Hortifruti', emoji: '🥦', color: 'bg-green-100' },
  { slug: 'carnes', label: 'Carnes', emoji: '🥩', color: 'bg-red-100' },
  { slug: 'laticinios', label: 'Laticínios', emoji: '🧀', color: 'bg-yellow-100' },
  { slug: 'padaria', label: 'Padaria', emoji: '🍞', color: 'bg-amber-100' },
  { slug: 'bebidas', label: 'Bebidas', emoji: '🥤', color: 'bg-blue-100' },
  { slug: 'limpeza', label: 'Limpeza', emoji: '🧼', color: 'bg-purple-100' },
]

const MOCK_PRODUCTS = [
  { id: 1, nome: 'Banana Prata', slug: 'banana-prata', preco: 4.99, precoDe: 6.99, imagens: [], isKg: true },
  { id: 2, nome: 'Maçã Fuji', slug: 'maca-fuji', preco: 8.99, precoDe: null, imagens: [], isKg: true },
  { id: 3, nome: 'Frango Inteiro', slug: 'frango-inteiro', preco: 14.99, precoDe: 18.99, imagens: [], isKg: true },
  { id: 4, nome: 'Leite Integral Piracanjuba 1L', slug: 'leite-integral', preco: 4.59, precoDe: null, imagens: [], isKg: false },
  { id: 5, nome: 'Coca-Cola 2L', slug: 'coca-cola-2l', preco: 8.99, precoDe: 10.99, imagens: [], isKg: false },
  { id: 6, nome: 'Pão de Forma Wickbold 500g', slug: 'pao-forma', preco: 7.99, precoDe: null, imagens: [], isKg: false },
  { id: 7, nome: 'Alcatra Bovina', slug: 'alcatra-bovina', preco: 38.99, precoDe: 44.99, imagens: [], isKg: true },
  { id: 8, nome: 'Sabão em Pó Omo 1kg', slug: 'sabao-omo', preco: 19.99, precoDe: null, imagens: [], isKg: false },
]

const TRUST_ITEMS = [
  { icon: 'local_shipping', title: 'Entrega rápida', desc: 'Produtos frescos na sua porta' },
  { icon: 'verified', title: 'Qualidade garantida', desc: 'Selecionados com cuidado' },
  { icon: 'inventory_2', title: '14 mil+ produtos', desc: 'Tudo que você precisa, num lugar só' },
]

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-[72px] md:pt-[88px]">
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
                Mais de 14 mil produtos com entrega rápida diretamente na sua porta.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/produtos"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-base hover:opacity-90 transition-opacity shadow-lg"
                >
                  <span className="material-symbols-outlined text-[20px]">storefront</span>
                  Ver todos os produtos
                </Link>
                <Link
                  href="/produtos?categoria=hortifruti"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-on-primary/10 text-on-primary font-bold text-base hover:bg-on-primary/20 transition-colors border border-on-primary/20"
                >
                  Hortifruti
                </Link>
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
        <section className="py-16 md:py-24">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Departamentos</p>
                <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface">Corredores do mercado</h2>
              </div>
              <Link href="/produtos" className="hidden sm:flex items-center gap-1 text-primary font-bold text-sm hover:opacity-70 transition-opacity">
                Ver todos
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {MOCK_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/produtos?categoria=${cat.slug}`}
                  className={`category-card flex flex-col items-center gap-3 p-6 rounded-xl ${cat.color} hover:shadow-md transition-shadow`}
                >
                  <span className="text-4xl">{cat.emoji}</span>
                  <span className="font-headline font-bold text-sm text-on-surface text-center">{cat.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Ofertas ── */}
        <section className="py-16 md:py-24 bg-surface-container-low">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Promoções</p>
                <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface">Ofertas da semana</h2>
              </div>
              <Link href="/produtos?oferta=true" className="hidden sm:flex items-center gap-1 text-primary font-bold text-sm hover:opacity-70 transition-opacity">
                Ver todas
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {MOCK_PRODUCTS.map((p) => (
                <ProductCard key={p.id} {...p} badge={p.precoDe ? 'Oferta' : undefined} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Search hub ── */}
        <section className="py-20 md:py-28">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface mb-4">
              Não achou o que procura?
            </h2>
            <p className="text-on-surface-variant text-lg mb-10 max-w-md mx-auto">
              Temos mais de 14 mil produtos. Use a busca para encontrar o que precisa.
            </p>
            <form action="/produtos" method="get" className="max-w-xl mx-auto relative">
              <input
                type="search"
                name="q"
                placeholder="Buscar produtos, marcas, categorias..."
                className="w-full bg-surface-container-highest rounded-full py-5 pl-7 pr-36 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-base shadow-sm"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary-gradient text-on-primary px-6 py-3 rounded-full font-bold text-sm">
                Buscar
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
