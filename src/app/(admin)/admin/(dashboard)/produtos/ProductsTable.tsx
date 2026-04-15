'use client'

import { useRef, useState, useTransition } from 'react'

export interface ProductRow {
  id: number
  nome: string
  slug: string
  preco: string
  precoDe: string | null
  estoque: string
  ativo: boolean
  isKg: boolean
  imagens: string[]
  categoriaNome: string | null
}

interface Props {
  rows: ProductRow[]
  updatePrice: (id: number, preco: string) => Promise<void>
  bulkToggle: (ids: number[], ativo: boolean) => Promise<void>
}

export default function ProductsTable({ rows, updatePrice, bulkToggle }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const allSelected = rows.length > 0 && selected.size === rows.length

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map(p => p.id)) : new Set())
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
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs underline">
            Cancelar
          </button>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden md:table-cell">Categoria</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Preço</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider hidden sm:table-cell">Estoque</th>
                <th className="text-center px-4 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {rows.map(p => {
                const imagem = p.imagens[0]
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-surface-container/50 transition-colors ${selected.has(p.id) ? 'bg-primary-container/10' : ''}`}
                  >
                    <td className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden shrink-0">
                          {imagem ? (
                            <img src={imagem} alt={p.nome} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px] text-outline-variant">image</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-on-surface truncate max-w-[200px] md:max-w-[300px]">{p.nome}</p>
                          <p className="text-xs text-on-surface-variant">{p.isKg ? 'Vendido por kg' : 'Unidade'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant hidden md:table-cell">
                      {p.categoriaNome ?? '—'}
                    </td>
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
                            className="text-primary font-bold text-xs px-2 py-1 rounded disabled:opacity-50"
                          >✓</button>
                          <button onClick={() => setEditingId(null)} className="text-on-surface-variant text-xs px-1">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(p.id, p.preco)}
                          className="font-bold text-on-surface hover:text-primary transition-colors"
                          title="Clique para editar o preço"
                        >
                          {Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </button>
                      )}
                      {p.precoDe && editingId !== p.id && (
                        <p className="text-xs text-on-surface-variant line-through">
                          {Number(p.precoDe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface-variant hidden sm:table-cell">
                      {Number(p.estoque).toLocaleString('pt-BR')} {p.isKg ? 'kg' : 'un'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        p.ativo
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
