'use client'

export default function LojaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <span className="material-symbols-outlined text-6xl text-outline-variant">error</span>
      <div>
        <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
          Ops, algo deu errado
        </h2>
        <p className="text-on-surface-variant">
          Não foi possível carregar esta página. Tente novamente em instantes.
        </p>
      </div>
      <button
        onClick={reset}
        className="btn-primary-gradient text-on-primary px-6 py-3 rounded-full font-bold text-sm"
      >
        Tentar novamente
      </button>
    </div>
  )
}
