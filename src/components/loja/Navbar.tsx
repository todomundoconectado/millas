'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '@/lib/store/cart'
import { useState, useEffect, useRef } from 'react'

const categories = [
  { label: "Cestas Milla's", href: '/produtos?categoria=2-cestas' },
  { label: 'Hortifruti', href: '/produtos?categoria=hortifruti' },
  { label: 'Carnes', href: '/produtos?categoria=carnes' },
  { label: 'Laticínios', href: '/produtos?categoria=laticinios' },
  { label: 'Padaria', href: '/produtos?categoria=padaria' },
  { label: 'Bebidas', href: '/produtos?categoria=bebidas' },
  { label: 'Limpeza', href: '/produtos?categoria=limpeza' },
]

interface Sugestao {
  id: number
  nome: string
  slug: string
  preco: string
  imagem: string | null
}

function fmtPreco(v: string | number) {
  return parseFloat(String(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const itemCount = useCart((s) => s.itemCount())
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const prevCount = useRef(itemCount)
  const [cartBounce, setCartBounce] = useState(false)
  const [cartTooltip, setCartTooltip] = useState(false)

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [showSugestoes, setShowSugestoes] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const desktopSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setCartBounce(true)
      setCartTooltip(true)
      setTimeout(() => setCartBounce(false), 400)
      setTimeout(() => setCartTooltip(false), 1600)
    }
    prevCount.current = itemCount
  }, [itemCount])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node)) {
        setShowSugestoes(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleSearchChange(val: string) {
    setSearch(val)
    clearTimeout(debounceRef.current)
    if (val.length < 3) {
      setSugestoes([])
      setShowSugestoes(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca-rapida?q=${encodeURIComponent(val)}`)
        const data = await res.json()
        setSugestoes(data.produtos ?? [])
        setShowSugestoes((data.produtos ?? []).length > 0)
      } catch {}
    }, 250)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setShowSugestoes(false)
    if (search.trim()) {
      router.push(`/produtos?q=${encodeURIComponent(search.trim())}`)
    }
  }

  function handleVerTodos() {
    setShowSugestoes(false)
    router.push(`/produtos?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 glass-nav ${
          scrolled ? 'shadow-lg shadow-on-secondary-fixed/5' : ''
        }`}
      >
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4 h-20 md:h-24">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <Image src="/logo-millas.png" alt="Super Millas" width={240} height={80} className="h-16 md:h-20 w-auto object-contain" />
            </Link>

            {/* Nav desktop */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {categories.map((cat) => {
                const active = pathname.includes(cat.href.split('?')[0]) &&
                  (pathname + '?').includes(cat.href.split('?')[1])
                return (
                  <Link
                    key={cat.label}
                    href={cat.href}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      active
                        ? 'text-primary font-bold bg-primary/8'
                        : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {cat.label}
                  </Link>
                )
              })}
            </nav>

            {/* Busca desktop com autocomplete */}
            <div ref={desktopSearchRef} className="hidden md:flex flex-1 max-w-md ml-auto relative">
              <form onSubmit={handleSearch} className="w-full relative">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setShowSugestoes(false)}
                  onFocus={() => sugestoes.length > 0 && setShowSugestoes(true)}
                  placeholder="Buscar produtos..."
                  className="w-full bg-surface-container-highest rounded-full py-2.5 pl-5 pr-14 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full btn-primary-gradient flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-white text-[18px]">search</span>
                </button>
              </form>

              {/* Dropdown autocomplete */}
              {showSugestoes && sugestoes.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden z-50">
                  {sugestoes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => {
                        setShowSugestoes(false)
                        setSearch('')
                        router.push(`/produtos/${s.slug}`)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-surface-container transition-colors"
                    >
                      {s.imagem ? (
                        <img
                          src={s.imagem}
                          alt={s.nome}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 bg-surface-container-high"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-outline-variant text-base">inventory_2</span>
                        </div>
                      )}
                      <span className="flex-1 text-sm text-on-surface line-clamp-1">{s.nome}</span>
                      <span className="text-sm font-bold text-primary shrink-0">{fmtPreco(s.preco)}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={handleVerTodos}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm text-primary font-medium hover:bg-surface-container transition-colors border-t border-outline-variant/20"
                  >
                    Ver todos os resultados para &ldquo;{search}&rdquo;
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1 ml-auto md:ml-2">
              {/* Carrinho */}
              <Link
                href="/carrinho"
                className="relative p-2 rounded-full hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface text-[26px]">
                  shopping_cart
                </span>
                {itemCount > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center transition-transform ${
                      cartBounce ? 'scale-125' : 'scale-100'
                    }`}
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
                {cartTooltip && (
                  <span className="animate-cart-balloon absolute -top-9 left-1/2 bg-on-surface text-surface text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap pointer-events-none shadow-md">
                    +1 no carrinho
                  </span>
                )}
              </Link>

              {/* Menu mobile */}
              <button
                className="lg:hidden p-2 rounded-full hover:bg-surface-container transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
              >
                <span className="material-symbols-outlined text-on-surface text-[26px]">
                  {menuOpen ? 'close' : 'menu'}
                </span>
              </button>
            </div>
          </div>

          {/* Busca mobile */}
          <form onSubmit={handleSearch} className="md:hidden pb-3 relative">
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full bg-surface-container-highest rounded-full py-2.5 pl-5 pr-12 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full btn-primary-gradient flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-white text-[18px]">search</span>
            </button>
          </form>
        </div>
      </header>

      {/* Menu mobile overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" />
          <nav
            className="absolute top-0 right-0 w-72 h-full bg-surface-container-lowest shadow-2xl flex flex-col pt-20 px-6 gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Categorias
            </p>
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface hover:bg-surface-container transition-colors font-medium"
              >
                {cat.label}
              </Link>
            ))}
            <div className="mt-auto pb-8">
              <Link
                href="/carrinho"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl btn-primary-gradient text-on-primary font-bold"
              >
                <span className="material-symbols-outlined filled text-[20px]">shopping_cart</span>
                Carrinho {itemCount > 0 && `(${itemCount})`}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
