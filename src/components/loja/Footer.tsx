import Link from 'next/link'

const links = [
  { label: 'Sobre nós', href: '#' },
  { label: 'Política de privacidade', href: '#' },
  { label: 'Fale conosco', href: '#' },
  { label: 'Entregas', href: '#' },
]

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant/20 py-10 mt-auto">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg btn-primary-gradient flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base filled">shopping_cart</span>
          </div>
          <span className="text-base font-headline font-extrabold text-primary">Super Millas</span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-xs uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors font-medium"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-xs text-on-surface-variant text-center md:text-right">
          © {new Date().getFullYear()} Super Millas.<br className="md:hidden" /> Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
