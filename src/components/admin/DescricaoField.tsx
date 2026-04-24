'use client'

import { useState } from 'react'

const INPUT =
  'w-full px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary'
const LABEL = 'block text-sm font-medium text-on-surface-variant mb-1'

interface Props {
  defaultDescricao: string | null
  defaultDescricaoIa: boolean
}

export default function DescricaoField({ defaultDescricao, defaultDescricaoIa }: Props) {
  const [iaAtivo, setIaAtivo] = useState(defaultDescricaoIa)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="descricao" className={LABEL}>Descrição</label>
        <button
          type="button"
          onClick={() => setIaAtivo(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
            iaAtivo
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant/30 hover:bg-primary/10'
          }`}
        >
          <span className="material-symbols-outlined text-sm leading-none">auto_awesome</span>
          {iaAtivo ? 'IA ativada' : 'Gerar por IA'}
        </button>
      </div>

      <input type="hidden" name="descricaoIa" value={iaAtivo ? '1' : '0'} />

      {iaAtivo && (
        <div className="flex items-start gap-2 px-4 py-2 mb-2 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary">
          <span className="material-symbols-outlined text-base leading-tight mt-0.5">auto_awesome</span>
          <span>Descrição será gerada por IA. Salve para confirmar.</span>
        </div>
      )}

      <textarea
        id="descricao"
        name="descricao"
        rows={6}
        defaultValue={defaultDescricao ?? ''}
        disabled={iaAtivo}
        className={`${INPUT} resize-y${iaAtivo ? ' opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  )
}
