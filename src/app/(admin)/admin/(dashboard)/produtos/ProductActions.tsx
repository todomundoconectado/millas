'use client'

import { useRef, useState, useTransition } from 'react'

interface ProductRow {
  id: number
  nome: string
  preco: string
}

interface Props {
  products: ProductRow[]
  updatePrice: (id: number, preco: string) => Promise<void>
  bulkToggle: (ids: number[], ativo: boolean) => Promise<void>
}

export default function ProductActions({ products, updatePrice, bulkToggle }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(products.map(p => p.id)) : new Set())
  }

  function startEdit(id: number, currentPreco: string) {
    setEditingId(id)
    setEditValue(Number(currentPreco).toFixed(2))
    setTimeout(() => inputRef.current?.select(), 50)
  }

  function savePrice(id: number) {
    const val = parseFloat(editValue.replace(',', '.'))
    if (isNaN(val) || val <= 0) { setEditingId(null); return }
    startTransition(async () => {
      await updatePrice(id, val.toFixed(2))
      setEditingId(null)
    })
  }

  function doBulk(ativo: boolean) {
    if (selected.size === 0) return
    startTransition(async () => {
      await bulkToggle([...selected], ativo)
      setSelected(new Set())
    })
  }

  const allSelected = products.length > 0 && selected.size === products.length

  return (
    <div>
      {/* Barra de ações em massa */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-primary-container rounded-xl text-on-primary-container text-sm">
          <span className="font-bold">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
          <button
            onClick={() => doBulk(true)}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold disabled:opacity-50"
          >
            Ativar
          </button>
          <button
            onClick={() => doBulk(false)}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-bold disabled:opacity-50"
          >
            Inativar
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs underline"
          >
            Cancelar
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant/20 bg-surface-container">
            <th className="px-4 py-3 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={e => toggleAll(e.target.checked)}
                className="rounded"
              />
            </th>
            <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Produto</th>
            <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Preço</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {products.map(p => (
            <tr key={p.id} className={`hover:bg-surface-container/50 transition-colors ${selected.has(p.id) ? 'bg-primary-container/20' : ''}`}>
              <td className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="rounded"
                />
              </td>
              <td className="px-4 py-3 font-medium text-on-surface">{p.nome}</td>
              <td className="px-4 py-3 text-right">
                {editingId === p.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-on-surface-variant text-xs">R$</span>
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') savePrice(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="w-24 px-2 py-1 rounded-lg bg-surface-container border border-primary text-on-surface text-sm text-right focus:outline-none"
                    />
                    <button
                      onClick={() => savePrice(p.id)}
                      disabled={isPending}
                      className="text-primary font-bold text-xs px-2 py-1 rounded"
                    >✓</button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-on-surface-variant text-xs px-1"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(p.id, p.preco)}
                    className="font-bold text-on-surface hover:text-primary transition-colors cursor-text"
                    title="Clique para editar o preço"
                  >
                    {Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
