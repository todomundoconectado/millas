'use client'

import { useState } from 'react'
import Link from 'next/link'

interface BatchResult {
  page: number
  totalPages: number
  totalProducts: number
  processed: number
  imported: number
  skipped: number
  noMatch: number
  errors: string[]
  done: boolean
  error?: string
}

export default function ImportarWooPage() {
  const [wooUrl, setWooUrl] = useState('https://millas.com.br')
  const [ck, setCk] = useState('')
  const [cs, setCs] = useState('')
  const [somenteSemImagem, setSomenteSemImagem] = useState(true)

  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [progress, setProgress] = useState({ page: 0, totalPages: 0, totalProducts: 0 })
  const [totals, setTotals] = useState({ imported: 0, skipped: 0, noMatch: 0, errors: 0 })
  const [log, setLog] = useState<string[]>([])

  function addLog(line: string) {
    setLog(prev => [...prev.slice(-200), line])
  }

  async function iniciar() {
    setRunning(true)
    setFinished(false)
    setProgress({ page: 0, totalPages: 0, totalProducts: 0 })
    setTotals({ imported: 0, skipped: 0, noMatch: 0, errors: 0 })
    setLog([])

    let page = 1
    let accImported = 0
    let accSkipped = 0
    let accNoMatch = 0
    let accErrors = 0

    while (true) {
      addLog(`⟳ Página ${page}...`)
      try {
        const res = await fetch('/api/admin/importar-woo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, perPage: 8, somenteSemImagem, wooUrl, ck, cs }),
        })
        const data: BatchResult = await res.json()

        if (!res.ok || data.error) {
          addLog(`❌ Erro: ${data.error ?? res.statusText}`)
          break
        }

        accImported += data.imported
        accSkipped += data.skipped
        accNoMatch += data.noMatch
        accErrors += data.errors.length

        setProgress({ page: data.page, totalPages: data.totalPages, totalProducts: data.totalProducts })
        setTotals({ imported: accImported, skipped: accSkipped, noMatch: accNoMatch, errors: accErrors })

        addLog(
          `✓ Página ${data.page}/${data.totalPages} — ` +
          `${data.imported} importados, ${data.skipped} pulados, ${data.noMatch} sem match` +
          (data.errors.length ? `, ${data.errors.length} erros` : '')
        )

        if (data.done) break
        page++
      } catch (err) {
        addLog(`❌ ${err instanceof Error ? err.message : String(err)}`)
        break
      }
    }

    setRunning(false)
    setFinished(true)
    addLog('✅ Importação concluída.')
  }

  const pct = progress.totalPages > 0 ? Math.round((progress.page / progress.totalPages) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">Importar imagens — WooCommerce</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Busca imagens do site antigo, converte para WebP e salva aqui
          </p>
        </div>
        <Link href="/admin/produtos" className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant text-sm font-medium">
          ← Voltar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-on-surface">Configuração</h2>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">URL do WooCommerce</label>
              <input
                value={wooUrl}
                onChange={e => setWooUrl(e.target.value)}
                disabled={running}
                className="w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Consumer Key</label>
              <input
                value={ck}
                onChange={e => setCk(e.target.value)}
                disabled={running}
                placeholder="ck_..."
                className="w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Consumer Secret</label>
              <input
                type="password"
                value={cs}
                onChange={e => setCs(e.target.value)}
                disabled={running}
                placeholder="cs_..."
                className="w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm font-mono disabled:opacity-50"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-on-surface">
              <input
                type="checkbox"
                checked={somenteSemImagem}
                onChange={e => setSomenteSemImagem(e.target.checked)}
                disabled={running}
                className="accent-primary w-4 h-4"
              />
              Apenas produtos sem imagem
            </label>

            <button
              onClick={iniciar}
              disabled={running || !ck || !cs}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50 w-full"
            >
              {running ? 'Importando...' : finished ? 'Importar novamente' : 'Iniciar importação'}
            </button>
          </div>
        </div>

        {/* Progress + Log */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Progress bar */}
          {(running || finished) && progress.totalPages > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-on-surface">
                  {finished ? 'Concluído' : 'Progresso'}
                </span>
                <span className="text-sm text-on-surface-variant tabular-nums">
                  Página {progress.page}/{progress.totalPages} · {progress.totalProducts} produtos no WooCommerce
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all ${finished ? 'bg-secondary' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Importados', value: totals.imported, color: 'text-primary' },
                  { label: 'Pulados', value: totals.skipped, color: 'text-on-surface-variant' },
                  { label: 'Sem match', value: totals.noMatch, color: 'text-on-surface-variant' },
                  { label: 'Erros', value: totals.errors, color: totals.errors > 0 ? 'text-error' : 'text-on-surface-variant' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log */}
          {log.length > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Log</p>
              <div className="max-h-72 overflow-y-auto flex flex-col gap-0.5">
                {log.map((line, i) => (
                  <p key={i} className="text-xs font-mono text-on-surface-variant leading-relaxed">{line}</p>
                ))}
                {running && (
                  <p className="text-xs font-mono text-primary animate-pulse">Processando...</p>
                )}
              </div>
            </div>
          )}

          {finished && (
            <Link href="/admin/produtos?semImagem=false" className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm text-center">
              Ver produtos com imagens →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
