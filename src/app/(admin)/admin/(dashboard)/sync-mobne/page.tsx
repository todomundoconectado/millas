'use client'

import { useState, useEffect, useRef } from 'react'

interface SyncResult {
  ok?: boolean
  error?: string
  newProducts?: number
  updatedProducts?: number
  updatedPrices?: number
  updatedStock?: number
  imagesFound?: number
  descriptionsGenerated?: number
  categoriesSynced?: number
  errors?: string[]
}

interface PointerRow { key: string; value: number; updatedAt: string }

interface FixResult {
  fixed: number
  ok: number
  total: number
  details: { id: number; antes: boolean; depois: boolean; motivo: string }[]
}

interface DiagResult {
  local: {
    totalMobne: number
    ativos: number
    inativosEstoque: number
    inativosSemImagem: number
    manuais: number
  }
  mobne: {
    total: number | null
    pages: number | null
    error: string | null
  }
  diff: number | null
  note: string | null
}

export default function SyncMobnePage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [pointers, setPointers] = useState<PointerRow[] | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [diag, setDiag] = useState<DiagResult | null>(null)
  const [diagLoading, setDiagLoading] = useState(false)
  const [fixResult, setFixResult] = useState<FixResult | null>(null)
  const [fixing, setFixing] = useState(false)

  // EAN image import
  const [eanStats, setEanStats] = useState<{ semImagem: number; totalComEan: number; comImagem: number } | null>(null)
  const [eanRunning, setEanRunning] = useState(false)
  const [eanProgress, setEanProgress] = useState<{ processados: number; encontradas: number; total: number } | null>(null)
  const [eanLog, setEanLog] = useState<string[]>([])
  const [eanDone, setEanDone] = useState(false)
  const eanCancelRef = useRef(false)

  // WooCommerce image import
  const [wooStats, setWooStats] = useState<{ semImagem: number; totalWoo: number; comImagem: number } | null>(null)
  const [wooRunning, setWooRunning] = useState(false)
  const [wooProgress, setWooProgress] = useState<{ importadas: number; pagAtual: number; totalPags: number } | null>(null)
  const [wooLog, setWooLog] = useState<string[]>([])
  const [wooDone, setWooDone] = useState(false)
  const wooCancelRef = useRef(false)

  function addLog(line: string) {
    setLog(prev => [...prev.slice(-100), line])
  }

  async function runSync() {
    setRunning(true)
    setResult(null)
    addLog('⟳ Iniciando sync com Mobne...')
    try {
      const res = await fetch('/api/cron/sync-mobne', { method: 'GET' })
      const data: SyncResult = await res.json()
      setResult(data)
      if (data.ok) {
        addLog(`✓ Sync concluído — ${data.newProducts} novos, ${data.updatedProducts} atualizados, ${data.updatedPrices} preços, ${data.updatedStock} estoques, ${data.imagesFound} imagens, ${data.categoriesSynced} categorias`)
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach(e => addLog(`  ⚠ ${e}`))
        }
      } else {
        addLog(`❌ Erro: ${data.error}`)
      }
      await loadPointers()
      await loadDiag()
    } catch (e) {
      addLog(`❌ ${e instanceof Error ? e.message : String(e)}`)
    }
    setRunning(false)
  }

  async function loadPointers() {
    try {
      const res = await fetch('/api/admin/sync-status')
      if (res.ok) setPointers(await res.json())
    } catch { /* silencioso */ }
  }

  async function fixStatus() {
    setFixing(true)
    setFixResult(null)
    try {
      const res = await fetch('/api/admin/sync-status', { method: 'POST' })
      if (res.ok) setFixResult(await res.json())
    } catch { /* silencioso */ }
    setFixing(false)
    await loadDiag()
  }

  async function loadDiag() {
    setDiagLoading(true)
    try {
      const res = await fetch('/api/admin/mobne-diagnostico')
      if (res.ok) setDiag(await res.json())
    } catch { /* silencioso */ }
    setDiagLoading(false)
  }

  async function loadEanStats() {
    try {
      const res = await fetch('/api/admin/importar-imagens-ean')
      if (res.ok) setEanStats(await res.json())
    } catch { /* silencioso */ }
  }

  async function loadWooStats() {
    try {
      const res = await fetch('/api/admin/importar-woo')
      if (res.ok) setWooStats(await res.json())
    } catch { /* silencioso */ }
  }

  async function runWooImport() {
    wooCancelRef.current = false
    setWooRunning(true)
    setWooDone(false)
    setWooProgress(null)
    setWooLog([])
    let page = 1
    let totalImportadas = 0

    try {
      while (true) {
        if (wooCancelRef.current) {
          setWooLog(l => [...l, '⏹ Processo cancelado pelo usuário.'])
          break
        }

        const res = await fetch('/api/admin/importar-woo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, perPage: 20, somenteSemImagem: true }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          setWooLog(l => [...l, `❌ ${err.error || `HTTP ${res.status}`}`])
          break
        }
        const data = await res.json()

        totalImportadas += data.imported ?? 0
        setWooProgress({ importadas: totalImportadas, pagAtual: data.page, totalPags: data.totalPages })

        const logLine = `Pág ${data.page}/${data.totalPages} — ${data.imported} importadas, ${data.noMatch} sem match, ${data.skippedJaTemImagem} já tinham imagem`
        setWooLog(l => [...l.slice(-200), logLine])
        if (data.errors?.length) {
          data.errors.slice(0, 3).forEach((e: string) => setWooLog(l => [...l, `  ⚠ ${e.slice(0, 80)}`]))
        }

        if (data.done) break
        page = (data.page ?? page) + 1
      }
    } catch (e) {
      setWooLog(l => [...l, `❌ ${e instanceof Error ? e.message : String(e)}`])
    }

    setWooRunning(false)
    setWooDone(true)
    await loadWooStats()
    await loadDiag()
  }

  function cancelWooImport() {
    wooCancelRef.current = true
  }

  async function runEanImport() {
    eanCancelRef.current = false
    setEanRunning(true)
    setEanDone(false)
    setEanProgress(null)
    setEanLog([])
    let offset = 0
    let totalEncontradas = 0
    let totalProcessados = 0

    try {
      while (true) {
        if (eanCancelRef.current) {
          setEanLog(l => [...l, '⏹ Processo cancelado pelo usuário.'])
          break
        }

        const res = await fetch('/api/admin/importar-imagens-ean', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset, limite: 20 }),
        })
        if (!res.ok) { setEanLog(l => [...l, `❌ Erro HTTP ${res.status}`]); break }
        const data = await res.json()

        totalProcessados += data.processados
        totalEncontradas += data.encontradas
        setEanProgress({ processados: totalProcessados, encontradas: totalEncontradas, total: data.total })

        for (const r of data.resultados ?? []) {
          if (r.ok) {
            setEanLog(l => [...l.slice(-200), `✓ #${r.id} ${r.nome.slice(0, 40)} → ${r.fonte}`])
          } else {
            setEanLog(l => [...l.slice(-200), `✗ #${r.id} ${r.nome.slice(0, 40)} → ${r.motivo}`])
          }
        }

        if (data.concluido) break
        offset = data.proximo
      }
    } catch (e) {
      setEanLog(l => [...l, `❌ ${e instanceof Error ? e.message : String(e)}`])
    }

    setEanRunning(false)
    setEanDone(true)
    await loadEanStats()
    await loadDiag()
  }

  function cancelEanImport() {
    eanCancelRef.current = true
  }

  useEffect(() => {
    loadPointers()
    loadDiag()
    loadEanStats()
    loadWooStats()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">Sync Mobne</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Sincronização automática de produtos, preços e estoque com o ERP Mobne
          </p>
        </div>
        <button
          onClick={runSync}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${running ? 'animate-spin' : ''}`}>sync</span>
          {running ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Diagnóstico / Comparação ────────────────────────────────── */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-on-surface">Comparação Mobne × Site</h2>
            <button
              onClick={loadDiag}
              disabled={diagLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[14px] ${diagLoading ? 'animate-spin' : ''}`}>refresh</span>
              Atualizar
            </button>
          </div>

          {diagLoading && !diag && (
            <p className="text-sm text-on-surface-variant">Consultando Mobne e banco de dados...</p>
          )}

          {diag && (
            <div className="flex flex-col gap-4">
              {/* Aviso de divergência */}
              {diag.diff !== null && diag.diff > 0 && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5 shrink-0">warning</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {diag.diff.toLocaleString('pt-BR')} produto{diag.diff !== 1 ? 's' : ''} no Mobne ainda não estão no site
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Parte pode ser de categorias internas excluídas (Almoxarifado, etc). Execute o sync para importar os novos.
                    </p>
                  </div>
                </div>
              )}

              {diag.diff !== null && diag.diff <= 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                  <span className="material-symbols-outlined text-green-600 text-[20px] shrink-0">check_circle</span>
                  <p className="text-sm font-semibold text-green-800">
                    Todos os produtos do Mobne estão no site
                    {diag.diff < 0 && ` (${Math.abs(diag.diff)} a mais no site — podem ser manuais)`}
                  </p>
                </div>
              )}

              {diag.mobne.error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-container rounded-xl">
                  <span className="material-symbols-outlined text-error text-[18px] shrink-0">cloud_off</span>
                  <p className="text-xs text-on-surface-variant">
                    Não foi possível consultar o total no Mobne: <span className="font-mono">{diag.mobne.error}</span>
                  </p>
                </div>
              )}

              {/* Grade de métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: 'Total no Mobne',
                    value: diag.mobne.total !== null ? diag.mobne.total.toLocaleString('pt-BR') : '—',
                    sub: diag.mobne.total !== null ? `${diag.mobne.pages} págs` : 'sem acesso',
                    color: 'text-on-surface',
                    icon: 'cloud_download',
                  },
                  {
                    label: 'Importados',
                    value: diag.local.totalMobne.toLocaleString('pt-BR'),
                    sub: 'do Mobne',
                    color: 'text-primary',
                    icon: 'inventory_2',
                  },
                  {
                    label: 'Ativos no site',
                    value: diag.local.ativos.toLocaleString('pt-BR'),
                    sub: `${diag.local.totalMobne > 0 ? Math.round(diag.local.ativos / diag.local.totalMobne * 100) : 0}% do total`,
                    color: 'text-green-600',
                    icon: 'visibility',
                  },
                  {
                    label: 'Inativos — estoque',
                    value: diag.local.inativosEstoque.toLocaleString('pt-BR'),
                    sub: '< 10 unidades',
                    color: diag.local.inativosEstoque > 0 ? 'text-amber-600' : 'text-on-surface-variant',
                    icon: 'inventory',
                  },
                  {
                    label: 'Aguardando imagem',
                    value: diag.local.inativosSemImagem.toLocaleString('pt-BR'),
                    sub: 'estoque ok, sem foto',
                    color: diag.local.inativosSemImagem > 0 ? 'text-orange-600' : 'text-on-surface-variant',
                    icon: 'image_not_supported',
                  },
                  {
                    label: 'Manuais',
                    value: diag.local.manuais.toLocaleString('pt-BR'),
                    sub: 'não vêm do Mobne',
                    color: 'text-on-surface-variant',
                    icon: 'edit',
                  },
                ].map(s => (
                  <div key={s.label} className="bg-surface-container rounded-xl p-4 text-center">
                    <span className={`material-symbols-outlined text-[20px] mb-1 ${s.color}`}>{s.icon}</span>
                    <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 font-medium leading-tight">{s.label}</p>
                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Verificar / corrigir status */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="text-sm font-bold text-on-surface mb-2">Verificar status dos produtos</h2>
          <p className="text-xs text-on-surface-variant mb-4">
            Aplica a regra <strong>ativo = estoque ≥ 10 E tem imagem</strong> em todos os produtos do Mobne.
            Use para corrigir inconsistências caso o sync não tenha atualizado corretamente.
          </p>
          <button
            onClick={fixStatus}
            disabled={fixing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${fixing ? 'animate-spin' : ''}`}>rule</span>
            {fixing ? 'Verificando...' : 'Verificar e corrigir status'}
          </button>

          {fixResult && (
            <div className="mt-4 flex flex-col gap-3">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                fixResult.fixed === 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <span className={`material-symbols-outlined text-[20px] ${fixResult.fixed === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {fixResult.fixed === 0 ? 'check_circle' : 'warning'}
                </span>
                <div>
                  <p className={`text-sm font-bold ${fixResult.fixed === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                    {fixResult.fixed === 0
                      ? `Tudo ok — ${fixResult.ok} produtos respeitando a regra`
                      : `${fixResult.fixed} produto${fixResult.fixed !== 1 ? 's' : ''} corrigido${fixResult.fixed !== 1 ? 's' : ''} de ${fixResult.total}`
                    }
                  </p>
                  {fixResult.fixed > 0 && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      {fixResult.ok} já estavam corretos. Os corrigidos tiveram o status ajustado.
                    </p>
                  )}
                </div>
              </div>

              {fixResult.details.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-xl bg-surface-container text-xs font-mono p-3 flex flex-col gap-1">
                  {fixResult.details.map(d => (
                    <p key={d.id} className={d.depois ? 'text-green-700' : 'text-amber-700'}>
                      #{d.id}: {d.antes ? 'ativo' : 'inativo'} → {d.depois ? 'ativo' : 'inativo'} ({d.motivo})
                    </p>
                  ))}
                  {fixResult.fixed > 50 && (
                    <p className="text-on-surface-variant">... e mais {fixResult.fixed - 50} produtos</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buscar imagens por EAN */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="text-sm font-bold text-on-surface mb-2">Buscar imagens por EAN</h2>
          <p className="text-xs text-on-surface-variant mb-4">
            Consulta o Open Food Facts para cada produto com código de barras sem imagem.
            Gratuito e sem cadastro — melhor cobertura para alimentos industrializados.
          </p>

          {eanStats && (
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-surface-container rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-on-surface tabular-nums">{eanStats.semImagem.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-on-surface-variant">com EAN sem imagem</p>
              </div>
              <div className="bg-surface-container rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-primary tabular-nums">{eanStats.comImagem.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-on-surface-variant">já têm imagem</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={runEanImport}
              disabled={eanRunning || eanStats?.semImagem === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${eanRunning ? 'animate-spin' : ''}`}>image_search</span>
              {eanRunning ? 'Buscando...' : `Buscar imagens por EAN`}
            </button>
            {eanRunning && (
              <button
                onClick={cancelEanImport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-error text-on-error font-bold text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">stop</span>
                Cancelar
              </button>
            )}
          </div>

          {/* Progresso */}
          {eanProgress && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>{eanProgress.processados} / {eanProgress.total} processados</span>
                <span className="text-primary font-semibold">{eanProgress.encontradas} imagens encontradas</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((eanProgress.processados / (eanProgress.total || 1)) * 100, 100)}%` }}
                />
              </div>
              {eanDone && (
                <p className="text-xs font-semibold text-green-700">
                  ✓ Concluído — {eanProgress.encontradas} imagens de {eanProgress.processados} produtos processados
                  ({eanProgress.total - eanProgress.encontradas > 0 ? `${eanProgress.total - eanProgress.encontradas} não encontrados` : 'todos encontrados'})
                </p>
              )}
            </div>
          )}

          {/* Log */}
          {eanLog.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-xl bg-surface-container p-3 flex flex-col gap-0.5">
              {eanLog.map((line, i) => (
                <p key={i} className={`text-xs font-mono ${line.startsWith('✓') ? 'text-green-700' : line.startsWith('✗') ? 'text-amber-700' : 'text-error'}`}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Importar imagens do WooCommerce */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="text-sm font-bold text-on-surface mb-2">Importar imagens do WooCommerce</h2>
          <p className="text-xs text-on-surface-variant mb-4">
            Baixa as imagens originais do site antigo (millas.com.br) para produtos que já têm woo_id vinculado.
            Mais rápido e confiável do que buscar por EAN — usa o link direto do WooCommerce.
          </p>

          {wooStats && (
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-surface-container rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-on-surface tabular-nums">{wooStats.semImagem.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-on-surface-variant">woo_id sem imagem</p>
              </div>
              <div className="bg-surface-container rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-primary tabular-nums">{wooStats.comImagem.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-on-surface-variant">já importadas</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={runWooImport}
              disabled={wooRunning || wooStats?.semImagem === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${wooRunning ? 'animate-spin' : ''}`}>cloud_download</span>
              {wooRunning ? 'Importando...' : 'Importar imagens WooCommerce'}
            </button>
            {wooRunning && (
              <button
                onClick={cancelWooImport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-error text-on-error font-bold text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">stop</span>
                Cancelar
              </button>
            )}
          </div>

          {wooProgress && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Página {wooProgress.pagAtual} de {wooProgress.totalPags}</span>
                <span className="text-secondary font-semibold">{wooProgress.importadas} imagens importadas</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                <div
                  className="bg-secondary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((wooProgress.pagAtual / (wooProgress.totalPags || 1)) * 100, 100)}%` }}
                />
              </div>
              {wooDone && (
                <p className="text-xs font-semibold text-green-700">
                  ✓ Concluído — {wooProgress.importadas} imagens importadas do WooCommerce
                </p>
              )}
            </div>
          )}

          {wooLog.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-xl bg-surface-container p-3 flex flex-col gap-0.5">
              {wooLog.map((line, i) => (
                <p key={i} className={`text-xs font-mono ${line.startsWith('❌') ? 'text-error' : line.startsWith('  ⚠') ? 'text-amber-700' : 'text-on-surface-variant'}`}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Resultado do sync */}
        {result && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
            <h2 className="text-sm font-bold text-on-surface mb-4">Último sync executado</h2>
            {result.error ? (
              <p className="text-sm text-error">{result.error}</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Novos produtos', value: result.newProducts ?? 0, color: 'text-primary' },
                  { label: 'Atualizados', value: result.updatedProducts ?? 0, color: 'text-on-surface' },
                  { label: 'Preços', value: result.updatedPrices ?? 0, color: 'text-secondary' },
                  { label: 'Estoques', value: result.updatedStock ?? 0, color: 'text-on-surface' },
                  { label: 'Imagens', value: result.imagesFound ?? 0, color: 'text-primary' },
                  { label: 'Erros', value: result.errors?.length ?? 0, color: (result.errors?.length ?? 0) > 0 ? 'text-error' : 'text-on-surface-variant' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cursores */}
        {pointers && pointers.length > 0 && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
            <h2 className="text-sm font-bold text-on-surface mb-4">Cursores de sync</h2>
            <p className="text-xs text-on-surface-variant mb-3">
              O sync é incremental — só busca o que mudou desde o último cursor. Para reimportar tudo, zere os cursores no banco.
            </p>
            <div className="flex flex-col gap-2">
              {pointers.map(p => (
                <div key={p.key} className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant font-mono text-xs">{p.key}</span>
                  <span className="text-on-surface font-bold tabular-nums">{p.value.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant mt-3">
              Cursor alto = muitos registros processados. Se for 0, a próxima rodada faz sync completo.
            </p>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Log da sessão</p>
            <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
              {log.map((line, i) => (
                <p key={i} className="text-xs font-mono text-on-surface-variant leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
