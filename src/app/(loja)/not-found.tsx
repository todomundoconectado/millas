import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-6">
      <span className="material-symbols-outlined text-8xl text-outline-variant">search_off</span>
      <div>
        <h1 className="text-3xl font-headline font-extrabold text-on-surface mb-2">
          Página não encontrada
        </h1>
        <p className="text-on-surface-variant text-base">
          O produto que você procura não existe ou foi removido.
        </p>
      </div>
      <Link
        href="/produtos"
        className="btn-primary-gradient text-on-primary px-8 py-3 rounded-full font-bold text-sm"
      >
        Ver todos os produtos
      </Link>
    </div>
  )
}
