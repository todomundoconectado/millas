import Link from 'next/link'
import Image from 'next/image'

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
        <div>
          <Image src="/logo-millas.png" alt="Super Millas" width={160} height={52} className="h-14 w-auto object-contain" />
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

        {/* Copyright + Dev */}
        <div className="flex flex-col items-center md:items-end gap-1">
          <p className="text-xs text-on-surface-variant text-center md:text-right">
            © {new Date().getFullYear()} Super Millas. Todos os direitos reservados.
          </p>
          <p className="text-xs text-on-surface-variant/60 text-center md:text-right">
            Desenvolvido por{' '}
            <a
              href="https://todomundoconectado.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors underline underline-offset-2"
            >
              Todo Mundo Conectado Ltda
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
