'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '@/lib/store/cart'
import { useState, useEffect, useRef } from 'react'

const categories = [
  { label: 'Hortifruti', href: '/produtos?categoria=hortifruti' },
  { label: 'Carnes', href: '/produtos?categoria=carnes' },
  { label: 'Laticínios', href: '/produtos?categoria=laticinios' },
  { label: 'Padaria', href: '/produtos?categoria=padaria' },
  { label: 'Bebidas', href: '/produtos?categoria=bebidas' },
  { label: 'Limpeza', href: '/produtos?categoria=limpeza' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const itemCount = useCart((s) => s.itemCount())
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const prevCount = useRef(itemCount)
  const [cartBounce, setCartBounce] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 400)
    }
    prevCount.current = itemCount
  }, [itemCount])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/produtos?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 glass-nav ${
          scrolled ? 'shadow-lg shadow-on-secondary-fixed/5' : ''
        }`}
      >
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4 h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg btn-primary-gradient flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg filled">
                  shopping_cart
                </span>
              </div>
              <span className="text-lg md:text-xl font-headline font-extrabold text-primary leading-none">
                Super Millas
              </span>
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

            {/* Busca desktop */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-md ml-auto relative"
            >
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              onChange={(e) => setSearch(e.target.value)}
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
