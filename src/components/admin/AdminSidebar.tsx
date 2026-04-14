'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/pedidos', label: 'Pedidos', icon: 'receipt_long' },
  { href: '/admin/produtos', label: 'Produtos', icon: 'inventory_2' },
  { href: '/admin/categorias', label: 'Categorias', icon: 'category' },
  { href: '/admin/promocoes', label: 'Promoções', icon: 'local_offer' },
  { href: '/admin/cupons', label: 'Cupons', icon: 'confirmation_number' },
  { href: '/admin/banners', label: 'Banners', icon: 'image' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-outline-variant/20">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl filled">storefront</span>
          <div>
            <p className="font-headline font-extrabold text-on-surface text-base leading-tight">Super Millas</p>
            <p className="text-xs text-on-surface-variant">Admin</p>
          </div>
        </Link>
      </div>

      {/* Links */}
      <div className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-on-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-outline-variant/20">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
          Ver loja
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors mt-1"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sair
        </button>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-surface-container-lowest border-r border-outline-variant/20 fixed top-0 left-0 h-screen flex-col">
        {navContent}
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow border border-outline-variant/20"
      >
        <span className="material-symbols-outlined text-on-surface">menu</span>
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-surface-container-lowest h-full flex flex-col shadow-xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
