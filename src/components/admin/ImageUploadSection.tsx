'use client'

import { useRef, useState, useTransition } from 'react'

interface Props {
  productId: number
  currentImages: string[]
  updateImagesAction: (formData: FormData) => Promise<void>
}

export default function ImageUploadSection({ productId, currentImages, updateImagesAction }: Props) {
  const [images, setImages] = useState<string[]>(currentImages)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    setError(null)
    setUploading(true)
    const uploaded: string[] = []

    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('pasta', `produtos/${productId}`)

      try {
        const res = await fetch('/api/admin/imagens', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Erro ao fazer upload')
          continue
        }
        uploaded.push(data.url)
      } catch {
        setError('Falha de rede ao enviar imagem')
      }
    }

    if (uploaded.length > 0) {
      setImages(prev => [...prev, ...uploaded])
    }
    setUploading(false)
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  function moveImage(from: number, to: number) {
    setImages(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  function handleSave() {
    const fd = new FormData()
    fd.append('imagens', images.join('\n'))
    startTransition(() => updateImagesAction(fd))
  }

  return (
    <div className="mt-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
      <h2 className="text-base font-bold text-on-surface mb-1">Imagens</h2>
      <p className="text-xs text-on-surface-variant mb-4">
        Upload automático — converte para WebP otimizado. Arraste ou clique para adicionar.
        A primeira imagem é a principal.
      </p>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-outline-variant/40 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-colors mb-4"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl animate-spin" style={{ animationDuration: '1s' }}>
              progress_activity
            </span>
            <p className="text-sm text-on-surface-variant">Convertendo para WebP...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-outline-variant text-3xl">upload</span>
            <p className="text-sm text-on-surface-variant">
              <span className="text-primary font-medium">Clique para escolher</span> ou arraste imagens aqui
            </p>
            <p className="text-xs text-on-surface-variant">JPG, PNG, WebP, GIF — máx 10 MB cada</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container/30 px-4 py-2 rounded-xl mb-4">{error}</p>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((img, i) => (
            <div
              key={img + i}
              className="relative w-24 h-24 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0 group"
            >
              <img src={img} alt={`Imagem ${i + 1}`} className="w-full h-full object-contain p-1" />
              {/* Principal badge */}
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-on-primary rounded px-1 py-0.5 leading-none">
                  Principal
                </span>
              )}
              {/* Número */}
              <span className="absolute top-1 right-1 text-[9px] font-bold bg-black/50 text-white rounded px-1">
                {i + 1}
              </span>
              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center gap-1 pb-1 opacity-0 group-hover:opacity-100">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i - 1)}
                    className="w-6 h-6 rounded bg-white/90 text-on-surface text-xs flex items-center justify-center"
                    title="Mover para cima"
                  >
                    ←
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="w-6 h-6 rounded bg-error text-on-error text-xs flex items-center justify-center"
                  title="Remover imagem"
                >
                  ✕
                </button>
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i + 1)}
                    className="w-6 h-6 rounded bg-white/90 text-on-surface text-xs flex items-center justify-center"
                    title="Mover para baixo"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || uploading}
          className="px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar imagens'}
        </button>
        {images.length === 0 && (
          <p className="text-xs text-on-surface-variant">Nenhuma imagem adicionada.</p>
        )}
        {images.length > 0 && (
          <p className="text-xs text-on-surface-variant">{images.length} imagem{images.length !== 1 ? 'ns' : ''}</p>
        )}
      </div>
    </div>
  )
}
