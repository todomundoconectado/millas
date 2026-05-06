'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

export default function ClubeMillas() {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/clube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, whatsapp, origem: window.location.href }),
      })
    } catch {}
    router.push('/clube')
  }

  return (
    <>
      <section className="py-20 md:py-28 bg-surface-container-low">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Exclusivo</p>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface mb-4">
            Participe do Clube Milla&apos;s
          </h2>
          <p className="text-on-surface-variant text-lg mb-10 max-w-md mx-auto">
            Ofertas exclusivas, sorteios, descontos adicionais, promoções e muito mais...
          </p>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#25D366] text-white font-bold text-base hover:bg-[#20b85a] transition-colors shadow-lg"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Entrar no Clube via WhatsApp
          </button>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
          <div
            className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-container transition-colors"
              aria-label="Fechar"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">close</span>
            </button>

            <h3 className="text-2xl font-headline font-extrabold text-on-surface mb-1">
              Clube Milla&apos;s
            </h3>
            <p className="text-on-surface-variant text-sm mb-6">
              Preencha para receber ofertas exclusivas pelo WhatsApp.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Seu nome</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="João Silva"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                  placeholder="(16) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 rounded-xl bg-[#25D366] text-white font-bold text-base hover:bg-[#20b85a] transition-colors disabled:opacity-60"
              >
                {loading ? 'Aguarde...' : 'Quero participar!'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
